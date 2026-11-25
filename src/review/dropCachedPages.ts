import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/api";
import type { Queryable } from "./types";
import { revalidateAllPublicationPaths } from "src/utils/revalidatePublication";

const REVALIDATE_CHUNK = 10;

// Cached pages of an account whose block just changed otherwise keep serving
// what they showed before until they expire. Only works inside a Next request
// (a server action or route handler), which is where both callers run.
export async function dropCachedPages(db: Queryable, dids: string[]) {
  let [docs, pubs] = await Promise.all([
    db.query(`select uri from documents where identity_did = any($1)`, [dids]),
    db.query(
      `select uri, name from publications where identity_did = any($1)`,
      [dids],
    ),
  ]);
  for (let did of dids) revalidatePath(`/p/${did}`, "layout");
  for (let row of docs.rows) {
    let uri = new AtUri(row.uri);
    revalidatePath(`/p/${uri.host}/${uri.rkey}`);
  }
  for (let i = 0; i < pubs.rows.length; i += REVALIDATE_CHUNK)
    await Promise.all(
      pubs.rows
        .slice(i, i + REVALIDATE_CHUNK)
        .map((row: { uri: string; name: string }) =>
          revalidateAllPublicationPaths(row.uri, [row.name]),
        ),
    );
}
