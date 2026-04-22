"use server";

import { render } from "@react-email/render";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { getCurrentDeploymentDomain } from "src/utils/getCurrentDeploymentDomain";
import { Ok, Err, type Result } from "src/result";
import { EMAIL_REGEX } from "src/utils/confirmationEmail";
import { extractEmailBlocksFromFacts } from "src/utils/postToEmailBlocks";
import type { Fact } from "src/replicache";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { PostEmail } from "emails/post";

type SendPreviewError =
  | "unauthorized"
  | "invalid_email"
  | "publication_not_found"
  | "newsletter_not_enabled"
  | "render_failed"
  | "email_send_failed";

export async function sendPostPreview(args: {
  publication_uri: string;
  root_entity: string;
  title: string;
  description?: string;
  to: string;
}): Promise<Result<null, SendPreviewError>> {
  const identity = await getIdentityData();
  if (!identity?.atp_did) return Err("unauthorized");

  const email = args.to.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return Err("invalid_email");

  const { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      "identity_did, record, publication_newsletter_settings(enabled, reply_to_email, reply_to_verified_at)",
    )
    .eq("uri", args.publication_uri)
    .single();

  if (!publication) return Err("publication_not_found");
  if (publication.identity_did !== identity.atp_did) return Err("unauthorized");

  const settings = publication.publication_newsletter_settings;
  if (!settings?.enabled || !settings.reply_to_email) {
    return Err("newsletter_not_enabled");
  }

  const { data: factsData } = await supabaseServerClient.rpc("get_facts", {
    root: args.root_entity,
  });
  const facts = (factsData as unknown as Fact<any>[]) || [];

  const blocks = extractEmailBlocksFromFacts(facts, args.root_entity);

  const pubRecord = normalizePublicationRecord(publication.record);
  const publicationName = pubRecord?.name || "Publication";
  const publicationUrl = pubRecord?.url || "https://leaflet.pub";

  const assetsBaseUrl = await getCurrentDeploymentDomain();

  let html: string;
  try {
    html = await render(
      PostEmail({
        publicationName,
        publicationUrl,
        postTitle: args.title || "(untitled)",
        postDescription: args.description,
        postUrl: publicationUrl,
        authorName: identity.bsky_profiles?.handle ?? undefined,
        publishedAtLabel: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        blocks,
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
      From: "Leaflet <newsletters@leaflet.pub>",
      ReplyTo: settings.reply_to_email,
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
