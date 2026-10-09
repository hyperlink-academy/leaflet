import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";

// Hands a new subscriber (or new paying member) to the publication's
// on-subscribe email, if it has an active one — checked here so the far more
// common publication without one doesn't start a job per subscribe.
// Best-effort: a missed welcome email must never fail the subscribe.
export async function queueOnSubscribeEmail(
  publicationUri: string,
  identityId: string,
): Promise<void> {
  try {
    const { count } = await supabaseServerClient
      .from("publication_email_posts")
      .select("id", { count: "exact", head: true })
      .eq("publication", publicationUri)
      .eq("send_mode", "on_subscribe")
      .eq("status", "active");
    if (!count) return;
    await inngest.send({
      name: "newsletter/subscriber.joined",
      data: { publication_uri: publicationUri, identity_id: identityId },
    });
  } catch (e) {
    console.error("[queueOnSubscribeEmail] failed:", e);
  }
}
