"use server";

import { render } from "@react-email/render";
import { getAuthIdentity } from "src/auth";
import { supabaseServerClient } from "supabase/serverClient";
import { getCurrentDeploymentDomain } from "src/utils/getCurrentDeploymentDomain";
import { Ok, Err, type Result } from "src/result";
import { EMAIL_REGEX } from "src/utils/confirmationEmail";
import { hydrateBskyPostBlocks } from "src/utils/fetchBskyPosts";
import { fetchStandardSiteBlockData } from "src/utils/fetchStandardSiteBlockData";
import { PostEmail } from "emails/post";
import { isConfirmedContributor } from "src/contributorPermissions";
import {
  draftContributorDids,
  draftPagesForEmail,
} from "src/emailPosts/draft";
import {
  emailAuthorName,
  emailBodyFromPages,
  resolveBroadcastSender,
} from "src/emailPosts/broadcast";

type SendPreviewError =
  | "unauthorized"
  | "invalid_email"
  | "publication_not_found"
  | "newsletter_not_enabled"
  | "no_from_address"
  | "render_failed"
  | "email_send_failed";

export async function sendPostPreview(args: {
  publication_uri: string;
  root_entity: string;
  // The leaflet (permission_token id) the draft belongs to. Used to resolve
  // the draft's contributors for the byline. Optional for backwards-compat.
  leaflet_id?: string;
  title: string;
  description?: string;
  to: string;
  // Previews an email-only post, which has no web page to link to.
  emailOnly?: boolean;
}): Promise<Result<null, SendPreviewError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err("unauthorized");

  const email = args.to.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return Err("invalid_email");

  const { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      "identity_did, record, publication_domains(domain), publication_newsletter_settings(enabled, reply_to_email, reply_to_verified_at)",
    )
    .eq("uri", args.publication_uri)
    .single();

  if (!publication) return Err("publication_not_found");
  const isOwner = publication.identity_did === identity.atp_did;
  const isContributor =
    isOwner ||
    (await isConfirmedContributor(args.publication_uri, identity.atp_did));
  if (!isContributor) return Err("unauthorized");

  const sender = resolveBroadcastSender(publication);
  if (!sender.ok) return Err(sender.error);
  const { pubProps, fromHeader, replyToEmail } = sender.value;

  const { pages: draftPages } = await draftPagesForEmail(args.root_entity);
  const { blocks, pages } = emailBodyFromPages(draftPages);
  const bskyPosts = await hydrateBskyPostBlocks(blocks);
  const { standardSitePosts, standardSitePublications } =
    await fetchStandardSiteBlockData(blocks);

  const assetsBaseUrl = await getCurrentDeploymentDomain();

  // The published `contributors` field doesn't exist yet at preview time, so
  // the byline comes from the draft's `leaflet_contributors`.
  const authorName = await emailAuthorName(
    identity.atp_did,
    args.leaflet_id
      ? await draftContributorDids(args.publication_uri, args.leaflet_id)
      : [],
  );

  let html: string;
  try {
    html = await render(
      PostEmail({
        ...pubProps,
        postTitle: args.title || "(untitled)",
        postDescription: args.description,
        postUrl: args.emailOnly ? undefined : pubProps.publicationUrl,
        authorName,
        publishedAtLabel: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        blocks,
        pages,
        bskyPosts,
        standardSitePosts,
        standardSitePublications,
        currentPublicationUri: args.publication_uri,
        did: identity.atp_did,
        assetsBaseUrl,
        // Omitting unsubscribeUrl triggers the "(preview)" footer branch.
      }),
    );
  } catch (e) {
    console.error("[sendPostPreview] render failed:", e);
    return Err("render_failed");
  }

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify({
      MessageStream: "outbound",
      From: fromHeader,
      ReplyTo: replyToEmail,
      To: email,
      Subject: `[preview] ${args.title || "(untitled)"}`,
      HtmlBody: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[sendPostPreview] postmark failed:", res.status, body);
    return Err("email_send_failed");
  }

  return Ok(null);
}
