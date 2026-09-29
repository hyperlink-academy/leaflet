import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";
import { isConfirmedContributor } from "src/contributorPermissions";
import { Ok, Err, type Result } from "src/result";
import {
  emailOnlyIneligibleReason,
  type EmailOnlyIneligibleReason,
} from "src/emailPosts/eligibility";
import { draftContributorDids, draftPagesForEmail } from "src/emailPosts/draft";
import {
  EMAIL_POST_SUMMARY_COLUMNS,
  isEmailPostFinal,
  isValidSendAt,
  UNSENT_EMAIL_POST_STATUSES,
  type EmailPostAudience,
  type EmailPostStatus,
  type EmailPostSummary,
} from "src/emailPosts/types";
import type { Json } from "supabase/database.types";

export type EmailPostSend =
  | { mode: "now" }
  | { mode: "scheduled"; send_at: string }
  | { mode: "on_subscribe" };

export type SaveEmailPostError =
  | "unauthorized"
  | EmailOnlyIneligibleReason
  | "not_a_draft"
  | "already_sent"
  | "invalid_send_at"
  | "on_subscribe_taken"
  | "database_error";

// The publication, if the actor owns it or is a confirmed contributor.
export async function loadActablePublication(
  publicationUri: string,
  actorDid: string,
) {
  const { data } = await supabaseServerClient
    .from("publications")
    .select("identity_did, publication_membership_settings(enabled)")
    .eq("uri", publicationUri)
    .maybeSingle();
  if (!data) return null;
  if (
    data.identity_did === actorDid ||
    (await isConfirmedContributor(publicationUri, actorDid))
  )
    return data;
  return null;
}

// Creates or updates the email-only post for a publication draft, snapshotting
// the draft's current content. Called with the signed-in actor's DID.
export async function saveEmailPost(
  args: {
    publication_uri: string;
    leaflet_id: string;
    title: string;
    description: string;
    send: EmailPostSend;
    audience: EmailPostAudience;
  },
  actorDid: string,
): Promise<Result<EmailPostSummary, SaveEmailPostError>> {
  const pub = await loadActablePublication(args.publication_uri, actorDid);
  if (!pub) return Err("unauthorized");

  // The draft must belong to this publication and never have been published
  // or scheduled to be: a post that's on the web, or on its way there, goes
  // out through the normal publish.
  const { data: draft } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("doc, permission_tokens(root_entity)")
    .eq("publication", args.publication_uri)
    .eq("leaflet", args.leaflet_id)
    .maybeSingle();
  const rootEntity = draft?.permission_tokens?.root_entity;
  if (!draft || draft.doc || !rootEntity) return Err("not_a_draft");

  const { count: scheduledPublishes } = await supabaseServerClient
    .from("publication_scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("leaflet", args.leaflet_id);
  if (scheduledPublishes) return Err("not_a_draft");

  const ineligible = await emailOnlyIneligibleReason(args.publication_uri);
  if (ineligible) return Err(ineligible);

  const { data: existing } = await supabaseServerClient
    .from("publication_email_posts")
    .select("id, publication, status, revision, send_mode, subscriber_count")
    .eq("leaflet", args.leaflet_id)
    .maybeSingle();
  if (existing && existing.publication !== args.publication_uri)
    return Err("not_a_draft");
  if (existing && isEmailPostFinal(existing.status as EmailPostStatus))
    return Err("already_sent");

  let sendAt: string | null = null;
  if (args.send.mode === "now") sendAt = new Date().toISOString();
  if (args.send.mode === "scheduled") {
    const at = new Date(args.send.send_at);
    if (!isValidSendAt(at)) return Err("invalid_send_at");
    sendAt = at.toISOString();
  }
  const onSubscribe = args.send.mode === "on_subscribe";

  const audience = pub.publication_membership_settings?.enabled
    ? args.audience
    : "all";

  // Free and paid can each have their own on-subscribe email; an "all" one
  // would reach the same readers, so it can't sit alongside either.
  if (onSubscribe) {
    let others = supabaseServerClient
      .from("publication_email_posts")
      .select("id", { count: "exact", head: true })
      .eq("publication", args.publication_uri)
      .eq("send_mode", "on_subscribe")
      .neq("leaflet", args.leaflet_id);
    if (audience !== "all") others = others.in("audience", ["all", audience]);
    const { count } = await others;
    if (count) return Err("on_subscribe_taken");
  }

  const [{ pages, imagePaths }, bylineDids] = await Promise.all([
    draftPagesForEmail(rootEntity),
    draftContributorDids(args.publication_uri, args.leaflet_id),
  ]);

  const revision = (existing?.revision ?? -1) + 1;
  const row = {
    publication: args.publication_uri,
    leaflet: args.leaflet_id,
    created_by: actorDid,
    title: args.title,
    description: args.description,
    pages: pages as unknown as Json,
    byline_dids: bylineDids,
    image_paths: imagePaths,
    send_mode: onSubscribe ? "on_subscribe" : "scheduled",
    send_at: sendAt,
    audience,
    status: onSubscribe ? "active" : "scheduled",
    revision,
    // An on-subscribe email's count is a running total across saves.
    subscriber_count:
      onSubscribe && existing?.send_mode === "on_subscribe"
        ? existing.subscriber_count
        : null,
    error: null,
    updated_at: new Date().toISOString(),
  };
  // Updates are guarded on the row still being unsent, so a save can't
  // rewrite an email a scheduled send has just claimed.
  const { data: saved, error } = existing
    ? await supabaseServerClient
        .from("publication_email_posts")
        .update(row)
        .eq("id", existing.id)
        .in("status", UNSENT_EMAIL_POST_STATUSES)
        .select(EMAIL_POST_SUMMARY_COLUMNS)
        .maybeSingle()
    : await supabaseServerClient
        .from("publication_email_posts")
        .insert(row)
        .select(EMAIL_POST_SUMMARY_COLUMNS)
        .single();
  if (error?.message.includes("publication_email_posts_one_on_subscribe"))
    return Err("on_subscribe_taken");
  if (error) {
    console.error("[saveEmailPost] save failed:", error);
    return Err("database_error");
  }
  if (!saved) return Err("already_sent");

  if (!onSubscribe)
    await inngest.send({
      name: "newsletter/email-post.send.requested",
      data: { email_post_id: saved.id, revision },
    });

  return Ok(saved as EmailPostSummary);
}

// Returns an unsent email-only post to being a plain draft.
export async function cancelEmailPost(
  leafletId: string,
  actorDid: string,
): Promise<Result<null, "unauthorized" | "already_sent" | "database_error">> {
  const { data: existing } = await supabaseServerClient
    .from("publication_email_posts")
    .select("id, publication, status")
    .eq("leaflet", leafletId)
    .maybeSingle();
  if (!existing) return Ok(null);
  if (!(await loadActablePublication(existing.publication, actorDid)))
    return Err("unauthorized");
  if (isEmailPostFinal(existing.status as EmailPostStatus))
    return Err("already_sent");
  // The status guard loses a race with a scheduled send claiming the row, so
  // a send that already started is never silently orphaned.
  const { data: deleted, error } = await supabaseServerClient
    .from("publication_email_posts")
    .delete()
    .eq("id", existing.id)
    .in("status", UNSENT_EMAIL_POST_STATUSES)
    .select("id");
  if (error) return Err("database_error");
  if (!deleted?.length) return Err("already_sent");
  return Ok(null);
}
