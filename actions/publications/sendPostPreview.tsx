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
import {
  buildFromHeader,
  resolveFromDomain,
  resolveReplyToEmail,
} from "src/utils/newsletterSender";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { PostEmail } from "emails/post";
import { emailPropsFromPublication } from "emails/fromPublication";
import { getProfiles } from "src/identity";
import { bylineName, formatBylineNames } from "src/utils/byline";

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
}): Promise<Result<null, SendPreviewError>> {
  const identity = await getIdentityData();
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
  if (publication.identity_did !== identity.atp_did) return Err("unauthorized");

  const settings = publication.publication_newsletter_settings;
  if (!settings?.enabled) {
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
  const fromDomain = resolveFromDomain(
    pubRecord?.url,
    publication.publication_domains?.[0]?.domain,
  );
  if (!fromDomain) return Err("no_from_address");
  const fromHeader = buildFromHeader(pubRecord?.name, fromDomain);
  const replyToEmail = resolveReplyToEmail(settings);

  const assetsBaseUrl = await getCurrentDeploymentDomain();

  // Resolve the draft's contributors (if any) for the byline. The published
  // `contributors` field doesn't exist yet at preview time, so we read the
  // draft's `leaflet_contributors`. Fall back to the current user's handle
  // (previous behavior) when there are no contributors.
  let authorName: string | undefined = identity.bsky_profiles?.handle ?? undefined;
  if (args.leaflet_id) {
    // Verify the leaflet actually belongs to this publication before reading
    // its contributors, so a client can't pass an arbitrary leaflet_id and
    // leak another draft's contributor list.
    const { data: leafletInPub } = await supabaseServerClient
      .from("leaflets_in_publications")
      .select("leaflet")
      .eq("publication", args.publication_uri)
      .eq("leaflet", args.leaflet_id)
      .maybeSingle();
    const { data: contributorRows } = leafletInPub
      ? await supabaseServerClient
          .from("leaflet_contributors")
          .select("contributor_did")
          .eq("leaflet", args.leaflet_id)
          .order("created_at", { ascending: true })
      : { data: [] };
    const contributorDids =
      contributorRows?.map((c) => c.contributor_did) ?? [];
    if (contributorDids.length > 0) {
      const profiles = await getProfiles(contributorDids);
      const names = contributorDids
        .map((did) => {
          const p = profiles.get(did);
          return bylineName({
            did,
            handle: p?.handle ?? null,
            displayName: p?.displayName ?? null,
          });
        })
        .filter((name) => !name.startsWith("did:"));
      if (names.length > 0) authorName = formatBylineNames(names);
    }
  }

  let html: string;
  try {
    html = await render(
      PostEmail({
        ...pubProps,
        postTitle: args.title || "(untitled)",
        postDescription: args.description,
        postUrl: pubProps.publicationUrl,
        authorName,
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
