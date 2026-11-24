"use server";

import { getAuthIdentity } from "src/auth";
import { supabaseServerClient } from "supabase/serverClient";
import { asAdmin } from "src/admin/asAdmin";
import { inngest } from "app/api/inngest/client";

export async function reviewPublication(args: { uri: string; spam: boolean }) {
  return asAdmin("publicationReview", async () => {
    let identity = await getAuthIdentity();
    let { error } = await supabaseServerClient
      .from("publication_reviews")
      .update({
        spam: args.spam,
        reviewed_at: new Date().toISOString(),
        reviewed_by: identity?.id ?? null,
      })
      .eq("publication", args.uri);
    if (error) throw new Error(error.message);
  });
}

// Puts the publication back in the queue.
export async function clearPublicationReview(args: { uri: string }) {
  return asAdmin("publicationReview", async () => {
    let { error } = await supabaseServerClient
      .from("publication_reviews")
      .update({ spam: false, reviewed_at: null, reviewed_by: null })
      .eq("publication", args.uri);
    if (error) throw new Error(error.message);
  });
}

// Requests the automated review for every queued publication that has no
// verdict yet. Publishing requests one on its own; this covers publications
// queued before the job existed, and any whose request was lost.
export async function reviewQueuedPublications() {
  return asAdmin("publicationReview", async () => {
    let { data, error } = await supabaseServerClient
      .from("publication_reviews")
      .select("publication")
      .is("reviewed_at", null)
      .is("classifier_verdict", null)
      .limit(1000);
    if (error) throw new Error(error.message);
    let rows = data ?? [];
    if (rows.length > 0)
      await inngest.send(
        rows.map((r) => ({
          name: "publication/review.requested" as const,
          data: { publication_uri: r.publication },
        })),
      );
    return rows.length;
  });
}
