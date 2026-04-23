"use server";

import { render } from "@react-email/render";
import { BlobRef } from "@atproto/lexicon";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { getCurrentDeploymentDomain } from "src/utils/getCurrentDeploymentDomain";
import { Ok, Err, type Result } from "src/result";
import { EMAIL_REGEX } from "src/utils/confirmationEmail";
import { processBlocksToPages } from "src/utils/factsToPagesRecord";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { PostEmail } from "emails/post";
import { emailPropsFromPublication } from "emails/fromPublication";

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
  const facts = (factsData as unknown as Fact<Attribute>[]) || [];

  // Preview runs on drafts before the document is published, so we can't
  // upload image blobs or poll records to the PDS here. The email template
  // detects an http(s) $link and uses it as a direct image URL; polls
  // render as "unsupported" in preview.
  const { pages } = await processBlocksToPages({
    facts,
    root_entity: args.root_entity,
    hooks: {
      uploadImage: async (src) =>
        ({ ref: { $link: src }, mimeType: "image/*", size: 0 }) as unknown as BlobRef,
      uploadPoll: null,
    },
  });
  const firstPage = pages[0];
  const blocks =
    firstPage?.type === "doc"
      ? (firstPage.blocks as PubLeafletPagesLinearDocument.Block[])
      : [];

  const pubRecord = normalizePublicationRecord(publication.record);
  const pubProps = emailPropsFromPublication(pubRecord);

  const assetsBaseUrl = await getCurrentDeploymentDomain();

  let html: string;
  try {
    html = await render(
      PostEmail({
        ...pubProps,
        postTitle: args.title || "(untitled)",
        postDescription: args.description,
        postUrl: pubProps.publicationUrl,
        authorName: identity.bsky_profiles?.handle ?? undefined,
        publishedAtLabel: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        blocks,
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
