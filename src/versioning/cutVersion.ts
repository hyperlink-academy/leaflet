import { createHash } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { v7 } from "uuid";
import { document_version_blob_refs, document_versions } from "drizzle/schema";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { storagePathFromSrc } from "src/utils/blobCleanup";

export type VersionKind = "named" | "pre_restore";

export type SnapshotFact = Fact<Attribute>;

export async function getClosureFacts(
  db: PgDatabase<any, any, any>,
  rootEntity: string,
): Promise<SnapshotFact[]> {
  let { rows } = (await db.execute(sql`
    SELECT id, entity, attribute, data, author_did
    FROM get_facts(${rootEntity})
    ORDER BY id
  `)) as { rows: SnapshotFact[] };
  return rows;
}

export function closureImagePaths(facts: SnapshotFact[]): string[] {
  let paths = new Set<string>();
  for (let f of facts) {
    if ((f.data as { type: string }).type === "image")
      paths.add(storagePathFromSrc((f.data as { src: string }).src));
  }
  return Array.from(paths);
}

export async function cutVersion(
  db: PgDatabase<any, any, any>,
  args: {
    tokenId: string;
    rootEntity: string;
    kind: VersionKind;
    name?: string | null;
    authorDid?: string | null;
    facts?: SnapshotFact[];
  },
): Promise<boolean> {
  let facts = args.facts ?? (await getClosureFacts(db, args.rootEntity));
  let serialized = JSON.stringify(facts);
  let closureHash = createHash("sha256").update(serialized).digest("hex");

  let [latest] = await db
    .select({ closure_hash: document_versions.closure_hash })
    .from(document_versions)
    .where(eq(document_versions.token, args.tokenId))
    .orderBy(desc(document_versions.created_at))
    .limit(1);
  if (latest && latest.closure_hash === closureHash)
    return false;

  let versionId = v7();
  let byteSize = Buffer.byteLength(serialized);
  await db.insert(document_versions).values({
    id: versionId,
    token: args.tokenId,
    kind: args.kind,
    name: args.name ?? null,
    author_did: args.authorDid ?? null,
    closure_hash: closureHash,
    // node-postgres serializes a bare JS array as a Postgres array literal,
    // not json, so the top-level array must be stringified and cast.
    snapshot: sql`${JSON.stringify(facts)}::jsonb`,
    fact_count: facts.length,
    byte_size: byteSize,
  });

  let paths = closureImagePaths(facts);
  if (paths.length > 0)
    await db
      .insert(document_version_blob_refs)
      .values(paths.map((path) => ({ version: versionId, path })))
      .onConflictDoNothing();

  return true;
}
