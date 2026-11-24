import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";

// Asks for an automated spam review of a publication that just published a
// post. A human decision is final, as is an automated spam flag; publications
// that predate the queue have no row and are never reviewed. Never throws: a
// failed request leaves the publication in the queue for a human.
export async function requestPublicationReview(publication_uri: string) {
  try {
    let { data } = await supabaseServerClient
      .from("publication_reviews")
      .select("reviewed_by, spam")
      .eq("publication", publication_uri)
      .maybeSingle();
    if (!data || data.reviewed_by || data.spam) return;
    await inngest.send({
      name: "publication/review.requested",
      data: { publication_uri },
    });
  } catch (e) {
    console.error("[publicationReview] request failed:", e);
  }
}
