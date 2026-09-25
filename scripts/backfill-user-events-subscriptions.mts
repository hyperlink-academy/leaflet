import { createClient } from "@supabase/supabase-js";
import { createTinybirdApi } from "@tinybirdco/sdk";
import { createHash } from "crypto";
import { Database } from "supabase/database.types";

/**
 * Backfill `subscribe` / `unsubscribe` rows into user_events from the older
 * subscription_events datasource, which predates those user events.
 *
 * Only `origin = 'app'` rows qualify: firehose-origin rows are subscriptions
 * made from other clients, with no signed-in Leaflet identity behind them.
 * Each row is mapped to an identity by its `subscriber` column — a DID, or the
 * sha256 of the email the app hashed it with — and skipped (and reported) when
 * nothing matches. The properties carry every subscription_events field so
 * the backfilled rows answer the same questions the old datasource did, plus
 * the same `pro` / `pro_source` stamp the app writes at ingest.
 *
 * Safe to re-run: rows are stamped `backfill = 'subscription_events'`, rows
 * already present under that stamp are skipped, and rows the app has since
 * recorded itself as user events are left alone.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-user-events-subscriptions.mts [--apply]
 *
 * Without --apply it only reports what would be written. Needs read access to
 * both datasources and append access to user_events; the app token has both.
 */

const APPLY = process.argv.includes("--apply");
// Mirrors PRO_ENTITLEMENT_KEY in src/entitlements.ts, which this ESM script
// can't import as a named export from that CJS-transpiled module.
const PRO_ENTITLEMENT_KEY = "publication_analytics";
const SOURCE = "subscription_events";
const TARGET = "user_events";
const BACKFILL_TAG = "subscription_events";
const INGEST_BATCH = 2000;

const token = process.env.TINYBIRD_TOKEN;
if (!token) {
  console.error("TINYBIRD_TOKEN is required.");
  process.exit(1);
}

const tinybird = createTinybirdApi({
  baseUrl: process.env.TINYBIRD_URL ?? "https://api.tinybird.co",
  token,
});

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

type SubscriptionEvent = {
  timestamp: string | number;
  event: string;
  method: string;
  origin: string;
  publication_uri: string;
  subscriber: string;
  record_uri: string;
  source_placement: string;
  source_publication: string;
  source_url: string;
};

type UserEventRow = {
  timestamp: number;
  identity_id: string;
  did: string;
  event: string;
  properties: Record<string, string>;
};

type Identity = { id: string; atp_did: string | null; email: string | null };
type Entitlement = { expires_at: string | null; source: string | null };

function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function rowKey(r: {
  timestamp: string | number;
  identity_id: string;
  event: string;
  publication: string;
}) {
  return `${Number(r.timestamp)}:${r.identity_id}:${r.event}:${r.publication}`;
}

async function count(sql: string) {
  let res = await tinybird.sql<{ n: string | number }>(
    `SELECT count() AS n ${sql} FORMAT JSON`,
  );
  return Number(res.data[0]?.n ?? 0);
}

async function fetchSourceRows(): Promise<SubscriptionEvent[]> {
  let where = `FROM ${SOURCE} WHERE origin = 'app'`;
  let res = await tinybird.sql<SubscriptionEvent>(
    `SELECT timestamp, event, method, origin, publication_uri, subscriber,
            record_uri, source_placement, source_publication, source_url
     ${where}
     ORDER BY timestamp
     FORMAT JSON`,
  );
  let total = await count(where);
  if (res.data.length !== total) {
    throw new Error(
      `read ${res.data.length} rows but ${total} exist; the SQL API result was cut short`,
    );
  }
  return res.data;
}

// The app now records these events itself. Once it does, the same action
// lands in both datasources a few milliseconds apart, so a source row with an
// app-tracked twin for the same identity, event and publication inside this
// window is one the app already counted.
const APP_TRACKED_WINDOW_MS = 60_000;

async function fetchAppTrackedRows() {
  let res = await tinybird.sql<{
    timestamp: string | number;
    identity_id: string;
    event: string;
    publication: string;
  }>(
    `SELECT timestamp, identity_id, event, properties['publication'] AS publication
     FROM ${TARGET}
     WHERE event IN ('subscribe', 'unsubscribe')
       AND NOT mapContains(properties, 'backfill')
     FORMAT JSON`,
  );
  let byAction = new Map<string, number[]>();
  for (let r of res.data) {
    let key = `${r.identity_id}:${r.event}:${r.publication}`;
    byAction.set(key, [...(byAction.get(key) ?? []), Number(r.timestamp)]);
  }
  return (row: UserEventRow) =>
    (
      byAction.get(
        `${row.identity_id}:${row.event}:${row.properties.publication}`,
      ) ?? []
    ).some((ts) => Math.abs(ts - row.timestamp) < APP_TRACKED_WINDOW_MS);
}

async function fetchExistingBackfillKeys(): Promise<Set<string>> {
  let res = await tinybird.sql<{
    timestamp: string | number;
    identity_id: string;
    event: string;
    publication: string;
  }>(
    `SELECT timestamp, identity_id, event, properties['publication'] AS publication
     FROM ${TARGET}
     WHERE properties['backfill'] = '${BACKFILL_TAG}'
     FORMAT JSON`,
  );
  return new Set(res.data.map(rowKey));
}

function chunks<T>(items: T[], size: number): T[][] {
  let out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

// Small enough per call to keep the PostgREST `in(...)` filter inside the
// request URL limit.
const LOOKUP_BATCH = 100;

async function fetchIdentitiesWhere(
  column: "id" | "atp_did",
  values: string[],
): Promise<Identity[]> {
  let out: Identity[] = [];
  for (let batch of chunks([...new Set(values)], LOOKUP_BATCH)) {
    let { data, error } = await supabase
      .from("identities")
      .select("id, atp_did, email")
      .in(column, batch);
    if (error) throw error;
    out.push(...data);
  }
  return out;
}

// Maps each `subscriber` value to an identity. A DID looks up the identity
// directly. An email hash can't be reversed, so hashed-email rows are matched
// against the email-subscriber rows of the publications they belong to, which
// store the address alongside the identity that confirmed it. That keeps the
// lookup proportional to the events rather than to the identities table.
async function resolveSubscribers(rows: SubscriptionEvent[]) {
  let dids = rows.map((r) => r.subscriber).filter((s) => s.startsWith("did:"));
  let hashedRows = rows.filter(
    (r) => r.subscriber && !r.subscriber.startsWith("did:"),
  );

  let resolved = new Map<string, Identity>();
  for (let identity of await fetchIdentitiesWhere("atp_did", dids))
    if (identity.atp_did) resolved.set(identity.atp_did, identity);

  let identityByEmailHash = new Map<string, string>();
  let publications = [...new Set(hashedRows.map((r) => r.publication_uri))];
  for (let batch of chunks(publications, LOOKUP_BATCH)) {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      let { data, error } = await supabase
        .from("publication_email_subscribers")
        .select("email, identity_id")
        .in("publication", batch)
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      for (let row of data)
        if (row.identity_id)
          identityByEmailHash.set(hashEmail(row.email), row.identity_id);
      if (data.length < PAGE) break;
    }
  }
  let identityIds = hashedRows
    .map((r) => identityByEmailHash.get(r.subscriber))
    .filter((id): id is string => !!id);
  let identitiesById = new Map(
    (await fetchIdentitiesWhere("id", identityIds)).map((i) => [i.id, i]),
  );
  for (let row of hashedRows) {
    let id = identityByEmailHash.get(row.subscriber);
    let identity = id && identitiesById.get(id);
    if (identity) resolved.set(row.subscriber, identity);
  }
  return resolved;
}

async function fetchProEntitlements() {
  let { data, error } = await supabase
    .from("user_entitlements")
    .select("identity_id, expires_at, source")
    .eq("entitlement_key", PRO_ENTITLEMENT_KEY);
  if (error) throw error;
  return new Map<string, Entitlement>(
    data.map((row) => [row.identity_id, row]),
  );
}

// Same rule as backfill-user-events-pro.mts: `granted_at` is reset on every
// renewal, so only `expires_at` can be trusted for point-in-time status.
function proProperties(at: number, entitlement: Entitlement | undefined) {
  let iso = new Date(at).toISOString();
  let pro =
    !!entitlement && (!entitlement.expires_at || entitlement.expires_at > iso);
  return {
    pro: String(pro),
    pro_source: pro ? entitlement?.source ?? "" : "",
  };
}

function toUserEvent(
  row: SubscriptionEvent,
  identity: Identity,
  entitlement: Entitlement | undefined,
): UserEventRow {
  let timestamp = Number(row.timestamp);
  return {
    timestamp,
    identity_id: identity.id,
    did: identity.atp_did ?? "",
    event: row.event,
    properties: {
      publication: row.publication_uri,
      method: row.method,
      record_uri: row.record_uri,
      source_placement: row.source_placement,
      source_publication: row.source_publication,
      source_url: row.source_url,
      backfill: BACKFILL_TAG,
      ...proProperties(timestamp, entitlement),
    },
  };
}

async function waitUntil(label: string, check: () => Promise<boolean>) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function timed<T>(label: string, work: () => Promise<T>): Promise<T> {
  let start = Date.now();
  let result = await work();
  console.log(`${label} (${Date.now() - start}ms)`);
  return result;
}

async function main() {
  let [source, isAppTracked, existing, entitlements] = await Promise.all([
    timed(`read ${SOURCE}`, fetchSourceRows),
    timed("read app-tracked rows", fetchAppTrackedRows),
    timed("read existing backfill rows", fetchExistingBackfillKeys),
    timed("read entitlements", fetchProEntitlements),
  ]);
  let identities = await timed("resolve subscribers", () =>
    resolveSubscribers(source),
  );

  let skipped = { appTracked: 0, alreadyBackfilled: 0 };
  let unmatched = new Map<string, number>();
  let rows: UserEventRow[] = [];
  for (let row of source) {
    let identity = identities.get(row.subscriber);
    if (!identity) {
      unmatched.set(row.subscriber, (unmatched.get(row.subscriber) ?? 0) + 1);
      continue;
    }
    let userEvent = toUserEvent(row, identity, entitlements.get(identity.id));
    if (isAppTracked(userEvent)) {
      skipped.appTracked++;
      continue;
    }
    let key = rowKey({
      timestamp: userEvent.timestamp,
      identity_id: userEvent.identity_id,
      event: userEvent.event,
      publication: userEvent.properties.publication,
    });
    if (existing.has(key)) {
      skipped.alreadyBackfilled++;
      continue;
    }
    existing.add(key);
    rows.push(userEvent);
  }

  let byEvent = new Map<string, number>();
  for (let r of rows) {
    let k = `${r.event}/${r.properties.method}`;
    byEvent.set(k, (byEvent.get(k) ?? 0) + 1);
  }
  let proRows = rows.filter((r) => r.properties.pro === "true").length;

  console.log(`${source.length} app-origin rows in ${SOURCE}`);
  console.log(
    `${skipped.appTracked} rows already tracked by the app, ${skipped.alreadyBackfilled} already backfilled`,
  );
  let unmatchedRows = [...unmatched.values()].reduce((a, b) => a + b, 0);
  if (unmatchedRows > 0) {
    console.log(
      `${unmatchedRows} rows across ${unmatched.size} subscribers match no identity:`,
    );
    for (let [subscriber, n] of unmatched)
      console.log(`  ${subscriber || "(empty)"}  rows=${n}`);
  }
  console.log(
    `${rows.length} rows to write across ${new Set(rows.map((r) => r.identity_id)).size} identities` +
      (rows.length > 0
        ? ` (${new Date(rows[0].timestamp).toISOString()} → ${new Date(rows[rows.length - 1].timestamp).toISOString()})`
        : ""),
  );
  for (let [k, n] of byEvent) console.log(`  ${k}: ${n}`);
  console.log(`${proRows} rows stamped pro`);

  if (rows.length === 0) {
    console.log("Nothing to write.");
    return;
  }
  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to append these rows.");
    return;
  }

  console.log(`\nAppending ${rows.length} rows to ${TARGET}...`);
  let successful = 0;
  for (let i = 0; i < rows.length; i += INGEST_BATCH) {
    let res = await tinybird.ingestBatch(
      TARGET,
      rows.slice(i, i + INGEST_BATCH),
      { wait: true },
    );
    successful += res.successful_rows;
    if (res.quarantined_rows > 0)
      console.error(
        `${res.quarantined_rows} rows quarantined in batch at ${i}`,
      );
  }
  console.log(`Ingested ${successful}/${rows.length} rows.`);

  let expected = existing.size;
  await waitUntil("appended rows to be visible", async () => {
    let n = await count(
      `FROM ${TARGET} WHERE properties['backfill'] = '${BACKFILL_TAG}'`,
    );
    return n >= expected;
  });
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
