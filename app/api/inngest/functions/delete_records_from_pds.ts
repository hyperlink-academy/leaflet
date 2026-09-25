import { inngest, events } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient } from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { isDocumentCollection } from "src/utils/collectionHelpers";
import { revalidateDocumentPaths } from "src/utils/revalidatePublication";

// Operator-triggered counterpart to write_records_to_pds: deletes records
// from a user's repo using their stored OAuth session, which only exists in
// the production environment (the session JWK isn't available locally). For
// document collections it also mirrors dashboard/deletePost's cleanup, so a
// post is gone even if the appview misses the firehose delete event.
export const delete_records_from_pds = inngest.createFunction(
  {
    id: "delete-records-from-pds",
    triggers: [events.userDeleteRecordsFromPds],
  },
  async ({ event, step }) => {
    const { did, records } = event.data;

    let deleted = 0;
    for (const rec of records) {
      const uri = AtUri.make(did, rec.collection, rec.rkey).toString();
      await step.run(`delete-${rec.collection}-${rec.rkey}`, async () => {
        const session = await restoreOAuthSession(did);
        if (!session.ok)
          throw new Error(
            `OAuth restore failed: ${session.error.message}`,
          );
        const agent = new AtpBaseClient(
          session.value.fetchHandler.bind(session.value),
        );
        const isDocument = isDocumentCollection(rec.collection);
        // Invalidated before the delete removes the join rows the lookup needs.
        if (isDocument) await revalidateDocumentPaths(uri);
        await agent.com.atproto.repo.deleteRecord({
          repo: did,
          collection: rec.collection,
          rkey: rec.rkey,
        });
        if (isDocument) {
          await Promise.all([
            supabaseServerClient.from("documents").delete().eq("uri", uri),
            supabaseServerClient
              .from("leaflets_in_publications")
              .delete()
              .eq("doc", uri),
          ]);
        }
      });
      deleted++;
    }

    return { success: true, recordsDeleted: deleted };
  },
);
