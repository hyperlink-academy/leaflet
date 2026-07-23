import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "supabase/database.types";
import type { CsvImportProvenance, SubscriberMetadata } from "./metadata";

// Core logic for bulk-importing a CSV of email addresses as subscribers to a
// publication, shared by the CLI script (scripts/import-email-subscribers.ts)
// and the admin UI (actions/admin/importSubscribers.ts).
//
// Rows are upserted into `publication_email_subscribers` keyed on
// (publication, email). New rows get state='confirmed' or 'pending'; existing
// 'unsubscribed' rows are reactivated as 'resubscribed'. No confirmation email
// is sent — this is intended for migrating an existing, consented list, not
// for cold imports.
//
// CSV format: one email per line. A header row is auto-detected. If multiple
// columns are present, the column named "email" is used; otherwise the first.
//
// If a header column matches /subscription_date|subscribed_at|created_at|^date$/i,
// its value backdates `created_at`, `confirmed_at` (when state=confirmed), and
// the corresponding event `occurred_at`. Existing rows keep their own
// `created_at`/`confirmed_at` — we never move those forward or backward.
//
// Opt-out signals are honored: a row is imported as `unsubscribed` (regardless
// of the requested state) when `subscriber_type` is `unsubscribed` or
// `undeliverable`, when `metadata.subscribed_to_emails` is `false`, or when
// `unsubscription_date` is set. Undeliverable rows record a `bounce` event;
// the rest record `unsubscribe_requested`. This keeps opted-out addresses on
// file as unsubscribed (so a later re-import can't silently resurrect them)
// instead of confirming them into the newsletter.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ImportState = "confirmed" | "pending";

export type OptOutReason = "unsubscribed" | "undeliverable";

export type CsvRow = {
  email: string;
  subscriptionDate: string | null;
  unsubscribedAt: string | null;
  optOut: OptOutReason | null;
  extras: Record<string, string>;
};

export type ImportTotals = {
  inserted: number;
  reactivated: number;
  unsubscribed: number;
  unchanged: number;
  failed: number;
  linked: number;
};

// Which CSV columns to read the email and subscription date from. When
// omitted, both are auto-detected from the header row (see detectColumns).
export type ColumnSelection = {
  emailColumn: number;
  dateColumn: number | null;
};

export type CsvAnalysis = {
  hasHeader: boolean;
  // Header names when a header row was detected; null for headerless files
  // (columns are only addressable by position).
  headers: string[] | null;
  columnCount: number;
  dataRowCount: number;
  // First data row, for showing sample values next to column choices.
  sampleRow: string[];
  suggested: ColumnSelection;
};

export type PreparedCsv = {
  // Valid rows, deduped within the file (first occurrence wins).
  rows: CsvRow[];
  // Deduped entries whose email didn't parse.
  invalid: string[];
  // Data rows in the CSV before dedupe/validation.
  rowCount: number;
  withDate: number;
  optOut: number;
};

// Sniff the delimiter from the first line: MailerLite ".csv" exports are
// actually tab-separated, and European-locale exports use semicolons. Counts
// candidate delimiters outside quoted fields; ties and none default to comma.
function sniffDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (c === "\n" || c === "\r") break;
      if (c in counts) counts[c]++;
    }
  }
  return Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

// Minimal CSV parser. Handles quoted fields with embedded delimiters/quotes,
// splitting on a sniffed delimiter (comma, tab, or semicolon). Not a full
// RFC 4180 implementation but enough for a one-column subscriber list with
// optional metadata.
export function parseCsv(text: string): string[][] {
  const delimiter = sniffDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }
  return rows;
}

// Decide whether a row represents someone who should NOT receive email.
// Ghost-style exports encode this in `subscriber_type` and
// `metadata.subscribed_to_emails`; a populated `unsubscription_date` is also
// treated as a hard opt-out. Returns the reason (which selects the opt-out
// event type) or null for an active subscriber.
function deriveOptOut(extras: Record<string, string>): OptOutReason | null {
  const type = (extras["subscriber_type"] ?? "").trim().toLowerCase();
  const subscribedToEmails = (
    extras["metadata.subscribed_to_emails"] ??
    extras["subscribed_to_emails"] ??
    ""
  )
    .trim()
    .toLowerCase();
  const unsubDate = (extras["unsubscription_date"] ?? "").trim();

  if (type === "undeliverable") return "undeliverable";
  if (type === "unsubscribed") return "unsubscribed";
  if (subscribedToEmails === "false") return "unsubscribed";
  if (unsubDate.length > 0) return "unsubscribed";
  return null;
}

// Tolerates "YYYY-MM-DD HH:MM:SS.ffffff+00:00" (Postgres-ish), ISO 8601, and
// single-digit-hour variants like "2023-12-17 6:50:22" — V8's Date parser
// handles all of these directly.
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Detect a header row: first cell isn't a valid email AND any cell looks
// header-y (contains "email" or has no @ symbols anywhere in the row). When
// there's a header, the email column is the one named "email" (else the
// first) and the date column is the first subscription_date-style name.
function detectColumns(rows: string[][]): {
  hasHeader: boolean;
  headers: string[];
  emailColumn: number;
  dateColumn: number;
} {
  const firstRow = rows[0] ?? [];
  const firstRowHasEmail = firstRow.some((c) => EMAIL_REGEX.test(c.trim()));
  if (firstRowHasEmail || rows.length === 0)
    return { hasHeader: false, headers: [], emailColumn: 0, dateColumn: -1 };

  const headers = firstRow.map((c) => c.trim());
  const emailIdx = headers.findIndex((c) => /email/i.test(c));
  return {
    hasHeader: true,
    headers,
    emailColumn: emailIdx >= 0 ? emailIdx : 0,
    dateColumn: headers.findIndex((c) =>
      /^(subscription_date|subscribed_at|subscribed|created_at|date|createdAt)$/i.test(
        c,
      ),
    ),
  };
}

export function analyzeCsv(text: string): CsvAnalysis {
  const rows = parseCsv(text);
  const detected = detectColumns(rows);
  const dataRows = rows.slice(detected.hasHeader ? 1 : 0);
  const sampleRow = dataRows[0] ?? [];
  return {
    hasHeader: detected.hasHeader,
    headers: detected.hasHeader ? detected.headers : null,
    columnCount: Math.max(detected.headers.length, sampleRow.length),
    dataRowCount: dataRows.length,
    sampleRow,
    suggested: {
      emailColumn: detected.emailColumn,
      dateColumn: detected.dateColumn >= 0 ? detected.dateColumn : null,
    },
  };
}

function extractRows(rows: string[][], selection?: ColumnSelection): CsvRow[] {
  if (rows.length === 0) return [];

  const detected = detectColumns(rows);
  const headers = detected.headers;
  const dataStart = detected.hasHeader ? 1 : 0;
  const emailColumn = selection?.emailColumn ?? detected.emailColumn;
  const dateColumn = selection
    ? (selection.dateColumn ?? -1)
    : detected.dateColumn;

  // Any column that isn't email or date gets preserved verbatim into the
  // row's `extras` map, keyed by its header. Without a header we can't name
  // the columns meaningfully, so extras stays empty.
  const extraColumns =
    headers.length > 0
      ? headers
          .map((name, idx) => ({ name, idx }))
          .filter(
            ({ name, idx }) =>
              name.length > 0 && idx !== emailColumn && idx !== dateColumn,
          )
      : [];

  return rows
    .slice(dataStart)
    .map((r) => {
      const extras: Record<string, string> = {};
      for (const { name, idx } of extraColumns) {
        const value = (r[idx] ?? "").trim();
        if (value.length > 0) extras[name] = value;
      }
      const optOut = deriveOptOut(extras);
      return {
        email: (r[emailColumn] ?? "").trim().toLowerCase(),
        subscriptionDate:
          dateColumn >= 0 ? parseDate((r[dateColumn] ?? "").trim()) : null,
        unsubscribedAt: optOut
          ? parseDate(
              extras["unsubscription_date"] ?? extras["churn_date"] ?? "",
            )
          : null,
        optOut,
        extras,
      };
    })
    .filter((r) => r.email.length > 0);
}

export function prepareCsv(
  text: string,
  selection?: ColumnSelection,
): PreparedCsv {
  const rawRows = extractRows(parseCsv(text), selection);

  // De-dupe within the file (keep the first occurrence) and split valid/invalid.
  const seen = new Set<string>();
  const rows: CsvRow[] = [];
  const invalid: string[] = [];
  for (const r of rawRows) {
    if (seen.has(r.email)) continue;
    seen.add(r.email);
    if (EMAIL_REGEX.test(r.email)) rows.push(r);
    else invalid.push(r.email);
  }

  return {
    rows,
    invalid,
    rowCount: rawRows.length,
    withDate: rows.filter((r) => r.subscriptionDate).length,
    optOut: rows.filter((r) => r.optOut).length,
  };
}

export type ImportOptions = {
  supabase: SupabaseClient<Database>;
  publicationUri: string;
  rows: CsvRow[];
  state: ImportState;
  // Plan against the current DB state and tally what would happen, without
  // writing anything.
  dryRun: boolean;
  // Recorded in row/event provenance metadata (e.g. the admin's email).
  importedBy?: string;
  batchSize?: number;
  onBatch?: (info: {
    batchIndex: number;
    processed: number;
    total: number;
    result: ImportTotals;
  }) => void;
  onError?: (message: string) => void;
};

async function importBatch(
  opts: ImportOptions,
  batch: CsvRow[],
): Promise<ImportTotals> {
  const { supabase, publicationUri, state: STATE, dryRun } = opts;
  const onError = opts.onError ?? console.error;
  const result: ImportTotals = {
    inserted: 0,
    reactivated: 0,
    unsubscribed: 0,
    unchanged: 0,
    failed: 0,
    linked: 0,
  };

  const emails = batch.map((r) => r.email);
  const rowByEmail = new Map(batch.map((r) => [r.email, r]));

  // Parallel: existing subscribers (so we can choose the correct event type
  // and skip confirmed rows we'd otherwise overwrite) + identity matches by
  // email so new rows get identity_id populated where possible.
  const [
    { data: existingRows, error: lookupError },
    { data: identityRows, error: identityError },
  ] = await Promise.all([
    supabase
      .from("publication_email_subscribers")
      .select(
        "id, email, state, created_at, confirmed_at, unsubscribed_at, identity_id",
      )
      .eq("publication", publicationUri)
      .in("email", emails),
    supabase.from("identities").select("id, email").in("email", emails),
  ]);
  if (lookupError) {
    onError(`subscriber lookup failed: ${lookupError.message}`);
    result.failed += emails.length;
    return result;
  }
  if (identityError) {
    onError(`identity lookup failed: ${identityError.message}`);
    result.failed += emails.length;
    return result;
  }

  const existingByEmail = new Map(
    (existingRows ?? []).map((r) => [r.email, r]),
  );
  const identityByEmail = new Map(
    (identityRows ?? [])
      .filter((r): r is { id: string; email: string } => !!r.email)
      .map((r) => [r.email.toLowerCase(), r.id]),
  );

  const nowIso = new Date().toISOString();
  const rowsToUpsert: any[] = [];
  const planned: {
    email: string;
    kind: "insert" | "reactivate" | "unsubscribe" | "skip";
    subscriptionDate: string | null;
    unsubscribedAt: string | null;
    optOut: OptOutReason | null;
    hadExisting: boolean;
  }[] = [];

  for (const email of emails) {
    const existing = existingByEmail.get(email);
    const matchedIdentityId = identityByEmail.get(email) ?? null;
    const csvRow = rowByEmail.get(email);
    const subscriptionDate = csvRow?.subscriptionDate ?? null;
    const optOut = csvRow?.optOut ?? null;

    // Opt-out signals in the CSV override the requested state: the row lands
    // as `unsubscribed` no matter what the operator asked for.
    const effectiveState: "confirmed" | "pending" | "unsubscribed" = optOut
      ? "unsubscribed"
      : STATE;

    if (existing && existing.state === effectiveState) {
      planned.push({
        email,
        kind: "skip",
        subscriptionDate,
        unsubscribedAt: null,
        optOut,
        hadExisting: true,
      });
      result.unchanged++;
      continue;
    }

    const kind =
      effectiveState === "unsubscribed"
        ? "unsubscribe"
        : existing?.state === "unsubscribed"
          ? "reactivate"
          : "insert";
    planned.push({
      email,
      kind,
      subscriptionDate,
      unsubscribedAt: csvRow?.unsubscribedAt ?? null,
      optOut,
      hadExisting: !!existing,
    });

    // Don't clobber an existing identity link with null — only set when we
    // either matched a new one or are preserving the existing one.
    const identityId = matchedIdentityId ?? existing?.identity_id ?? null;
    if (matchedIdentityId && matchedIdentityId !== existing?.identity_id) {
      result.linked++;
    }

    // Preserve existing rows' created_at/confirmed_at so we never move a real
    // subscription forward or backward. Only new inserts get backdated from
    // the CSV; reactivations and pending->confirmed upgrades keep their
    // original timestamps. An unsubscribed row keeps whatever confirmation it
    // had (it was a real subscriber before opting out), and records
    // unsubscribed_at from the CSV where available.
    const extras = csvRow?.extras ?? {};
    const provenance: CsvImportProvenance = {
      source: "csv_import",
      imported_at: nowIso,
      ...(opts.importedBy ? { imported_by: opts.importedBy } : {}),
      ...(Object.keys(extras).length > 0 ? { csv_columns: extras } : {}),
    };
    const metadata: SubscriberMetadata = provenance;
    rowsToUpsert.push({
      publication: publicationUri,
      email,
      identity_id: identityId,
      state: effectiveState,
      confirmation_code: null,
      created_at: existing?.created_at ?? subscriptionDate ?? nowIso,
      confirmed_at:
        effectiveState === "confirmed"
          ? (existing?.confirmed_at ?? subscriptionDate ?? nowIso)
          : effectiveState === "unsubscribed"
            ? (existing?.confirmed_at ?? subscriptionDate ?? null)
            : null,
      unsubscribed_at:
        effectiveState === "unsubscribed"
          ? (existing?.unsubscribed_at ??
            csvRow?.unsubscribedAt ??
            subscriptionDate ??
            nowIso)
          : null,
      metadata,
    });
  }

  if (rowsToUpsert.length === 0) return result;

  if (dryRun) {
    for (const p of planned) {
      if (p.kind === "insert") result.inserted++;
      else if (p.kind === "reactivate") result.reactivated++;
      else if (p.kind === "unsubscribe") result.unsubscribed++;
    }
    return result;
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("publication_email_subscribers")
    .upsert(rowsToUpsert, { onConflict: "publication,email" })
    .select("id, email");
  if (upsertError || !upserted) {
    onError(`upsert failed: ${upsertError?.message}`);
    result.failed += rowsToUpsert.length;
    return result;
  }

  const idByEmail = new Map(upserted.map((r) => [r.email, r.id]));
  const eventRows = planned
    .filter((p) => p.kind !== "skip")
    .flatMap((p) => {
      const id = idByEmail.get(p.email);
      if (!id) return [];
      const occurredAt = p.subscriptionDate ?? nowIso;
      const metadata = {
        source: "csv_import",
        imported_at: nowIso,
        ...(opts.importedBy ? { imported_by: opts.importedBy } : {}),
      };
      const mk = (event_type: string, occurred_at: string) => ({
        subscriber: id,
        publication: publicationUri,
        event_type,
        occurred_at,
        metadata,
      });

      if (p.kind === "unsubscribe") {
        const optOutEvent =
          p.optOut === "undeliverable" ? "bounce" : "unsubscribe_requested";
        const optOutAt = p.unsubscribedAt ?? nowIso;
        // For a brand-new opted-out row, record the subscribe that must have
        // preceded the opt-out so the event history isn't orphaned; an
        // already-existing subscriber already has that history.
        return p.hadExisting
          ? [mk(optOutEvent, optOutAt)]
          : [mk("subscribe_requested", occurredAt), mk(optOutEvent, optOutAt)];
      }

      const events: any[] = [
        mk(
          p.kind === "reactivate" ? "resubscribed" : "subscribe_requested",
          occurredAt,
        ),
      ];
      if (STATE === "confirmed") {
        events.push(mk("confirmed", occurredAt));
      }
      return events;
    });

  if (eventRows.length > 0) {
    const { error: eventError } = await supabase
      .from("publication_email_subscriber_events")
      .insert(eventRows);
    if (eventError) {
      // Subscriber rows already wrote successfully — don't double-count as
      // failed. Surface the event-write failure so the operator can backfill
      // events later if it matters for analytics.
      onError(`event insert failed: ${eventError.message}`);
    }
  }

  for (const p of planned) {
    if (p.kind === "insert") result.inserted++;
    else if (p.kind === "reactivate") result.reactivated++;
    else if (p.kind === "unsubscribe") result.unsubscribed++;
  }
  return result;
}

export async function importSubscribers(
  opts: ImportOptions,
): Promise<ImportTotals> {
  const batchSize = opts.batchSize ?? 500;
  const totals: ImportTotals = {
    inserted: 0,
    reactivated: 0,
    unsubscribed: 0,
    unchanged: 0,
    failed: 0,
    linked: 0,
  };

  for (let i = 0; i < opts.rows.length; i += batchSize) {
    const batch = opts.rows.slice(i, i + batchSize);
    const r = await importBatch(opts, batch);
    totals.inserted += r.inserted;
    totals.reactivated += r.reactivated;
    totals.unsubscribed += r.unsubscribed;
    totals.unchanged += r.unchanged;
    totals.failed += r.failed;
    totals.linked += r.linked;
    opts.onBatch?.({
      batchIndex: Math.floor(i / batchSize),
      processed: i + batch.length,
      total: opts.rows.length,
      result: r,
    });
  }

  return totals;
}
