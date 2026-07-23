"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { isAdminEmail } from "src/adminAllowlist";
import { getProfiles, idResolver } from "src/identity";
import {
  importSubscribers,
  prepareCsv,
  type ColumnSelection,
  type ImportState,
  type ImportTotals,
} from "src/email-subscribers/import";

export type AdminImportError =
  | "unauthorized"
  | "invalid_input"
  | "publication_not_found"
  | "database_error";

export type AdminPublicationSearchResult = {
  uri: string;
  name: string;
  identity_did: string;
  handle: string | null;
  subscriberCount: number;
};

export type ImportPreview = {
  // CSV shape
  rowCount: number;
  unique: number;
  valid: number;
  withDate: number;
  optOut: number;
  invalid: number;
  invalidSamples: string[];
  // What a real run would do, planned against current DB state
  totals: ImportTotals;
};

async function getAdminIdentity() {
  let identity = await getIdentityData();
  if (!identity || !isAdminEmail(identity.email)) return null;
  return identity;
}

export async function searchPublications(
  query: string,
): Promise<Result<AdminPublicationSearchResult[], AdminImportError>> {
  if (!(await getAdminIdentity())) return Err("unauthorized");

  let q = query.trim();
  if (!q) return Err("invalid_input");

  const select =
    "uri, name, identity_did, publication_email_subscribers(count)";
  type Match = {
    uri: string;
    name: string;
    identity_did: string;
    publication_email_subscribers: { count: number }[];
  };
  let matches: Match[] = [];

  if (q.startsWith("at://")) {
    let { data, error } = await supabaseServerClient
      .from("publications")
      .select(select)
      .eq("uri", q)
      .limit(10);
    if (error) return Err("database_error");
    matches = data ?? [];
  } else if (q.startsWith("did:")) {
    let { data, error } = await supabaseServerClient
      .from("publications")
      .select(select)
      .eq("identity_did", q)
      .limit(10);
    if (error) return Err("database_error");
    matches = data ?? [];
  } else {
    let { data, error } = await supabaseServerClient
      .from("publications")
      .select(select)
      .ilike("name", `%${q.replace(/[%_]/g, "\\$&")}%`)
      .limit(10);
    if (error) return Err("database_error");
    matches = data ?? [];

    // A bare word could also be a bsky handle — resolve it and include that
    // account's publications too.
    let did = await idResolver.handle
      .resolve(q.replace(/^@/, ""))
      .catch(() => null);
    if (did) {
      let { data: byDid } = await supabaseServerClient
        .from("publications")
        .select(select)
        .eq("identity_did", did)
        .limit(10);
      for (let row of byDid ?? [])
        if (!matches.find((m) => m.uri === row.uri)) matches.push(row);
    }
  }

  let profiles = await getProfiles([
    ...new Set(matches.map((m) => m.identity_did)),
  ]);

  return Ok(
    matches.map((m) => ({
      uri: m.uri,
      name: m.name,
      identity_did: m.identity_did,
      handle: profiles.get(m.identity_did)?.handle ?? null,
      subscriberCount: m.publication_email_subscribers[0]?.count ?? 0,
    })),
  );
}

type ImportArgs = {
  publicationUri: string;
  csvText: string;
  state: ImportState;
  columns?: ColumnSelection;
};

function validColumnSelection(columns: ColumnSelection | undefined): boolean {
  if (!columns) return true;
  if (!Number.isInteger(columns.emailColumn) || columns.emailColumn < 0)
    return false;
  if (columns.dateColumn === null) return true;
  return (
    Number.isInteger(columns.dateColumn) &&
    columns.dateColumn >= 0 &&
    columns.dateColumn !== columns.emailColumn
  );
}

async function validateImportInput(
  args: ImportArgs,
): Promise<AdminImportError | null> {
  if (!args.publicationUri.trim() || !args.csvText.trim())
    return "invalid_input";
  if (args.state !== "confirmed" && args.state !== "pending")
    return "invalid_input";
  if (!validColumnSelection(args.columns)) return "invalid_input";

  let { data, error } = await supabaseServerClient
    .from("publications")
    .select("uri")
    .eq("uri", args.publicationUri)
    .maybeSingle();
  if (error) return "database_error";
  if (!data) return "publication_not_found";
  return null;
}

export async function dryRunEmailImport(
  args: ImportArgs,
): Promise<Result<ImportPreview, AdminImportError>> {
  if (!(await getAdminIdentity())) return Err("unauthorized");

  let invalidReason = await validateImportInput(args);
  if (invalidReason) return Err(invalidReason);

  let prepared = prepareCsv(args.csvText, args.columns);
  let totals = await importSubscribers({
    supabase: supabaseServerClient,
    publicationUri: args.publicationUri,
    rows: prepared.rows,
    state: args.state,
    dryRun: true,
    onError: (msg) => console.error("[admin/import-subscribers]", msg),
  });
  if (totals.failed > 0) return Err("database_error");

  return Ok({
    rowCount: prepared.rowCount,
    unique: prepared.rows.length + prepared.invalid.length,
    valid: prepared.rows.length,
    withDate: prepared.withDate,
    optOut: prepared.optOut,
    invalid: prepared.invalid.length,
    invalidSamples: prepared.invalid.slice(0, 10),
    totals,
  });
}

export async function runEmailImport(
  args: ImportArgs,
): Promise<Result<ImportTotals, AdminImportError>> {
  let admin = await getAdminIdentity();
  if (!admin) return Err("unauthorized");

  let invalidReason = await validateImportInput(args);
  if (invalidReason) return Err(invalidReason);

  let prepared = prepareCsv(args.csvText, args.columns);
  let totals = await importSubscribers({
    supabase: supabaseServerClient,
    publicationUri: args.publicationUri,
    rows: prepared.rows,
    state: args.state,
    dryRun: false,
    importedBy: admin.email ?? undefined,
    onError: (msg) => console.error("[admin/import-subscribers]", msg),
  });
  return Ok(totals);
}
