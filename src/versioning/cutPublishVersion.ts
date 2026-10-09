import { drizzle } from "drizzle-orm/node-postgres";

import { pool } from "supabase/pool";
import { cutVersion } from "src/versioning/cutVersion";
import { documentHasProOwner } from "src/versioning/versionAccess";

// Snapshots a leaflet as it was published. Gated on the document rather than
// the viewer because scheduled publishes run without a signed-in user.
// Best-effort: a failed snapshot must never fail a publish that already landed.
export async function cutPublishVersion(args: {
  tokenId: string;
  rootEntity: string;
  authorDid: string;
  firstPublish: boolean;
}) {
  let { firstPublish, ...versionArgs } = args;
  try {
    if (!(await documentHasProOwner(args.tokenId))) return;
    const client = await pool.connect();
    try {
      await drizzle(client).transaction((tx) =>
        cutVersion(tx, {
          ...versionArgs,
          kind: firstPublish ? "publish" : "publish_revision",
        }),
      );
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[publish] couldn't save a version", {
      tokenId: args.tokenId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
