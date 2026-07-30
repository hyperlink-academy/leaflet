"use server";

import { AtpAgent, AppBskyFeedDefs } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import { getViewerIdentity } from "actions/viewerIdentity";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { getDocumentPages } from "lexicons/src/normalize";
import { isEntitledToGatedPost, postHasMembersDelimiter } from "src/membership";
import { getReaderMembership } from "src/membership.server";
import { collectAndFetchBlockResources } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/collectAndFetchBlockResources";
import type { PollData } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/fetchPollData";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import type { PubLeafletContent } from "lexicons/api";

export type UnlockedPost = {
  pages: PubLeafletContent.Main["pages"];
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  pollData: PollData[];
};

// Companion to getPostPageData's unconditional gating: published pages render
// the truncated variant for everyone, and an entitled reader swaps the full
// post in from here. The entitlement check is the only thing standing between a
// caller and the gated blocks, so it happens here, server-side, over rows this
// function fetches itself — the uri argument is a lookup key, not a claim.
export async function getUnlockedPost(
  uri: string,
): Promise<{ entitled: false } | ({ entitled: true } & UnlockedPost)> {
  const identity = await getViewerIdentity();
  if (!identity) return { entitled: false };

  const { data: document } = await supabaseServerClient
    .from("documents")
    .select(
      `data, uri,
       documents_in_publications(publications(uri, identity_did,
         publication_membership_settings(enabled),
         publication_contributors(contributor_did, confirmed)))`,
    )
    .eq("uri", uri)
    .order("publication", { referencedTable: "documents_in_publications" })
    .maybeSingle();
  const pub = document?.documents_in_publications[0]?.publications;
  if (!document || !pub?.publication_membership_settings?.enabled)
    return { entitled: false };

  const record = normalizeDocumentRecord(document.data, document.uri);
  if (!record || !postHasMembersDelimiter(record)) return { entitled: false };

  const rows = {
    viewerDid: identity.atp_did,
    ownerDid: pub.identity_did,
    contributors: pub.publication_contributors,
  };
  const entitled =
    isEntitledToGatedPost({ ...rows, membership: null }) ||
    isEntitledToGatedPost({
      ...rows,
      membership: await getReaderMembership(pub.uri, identity.id),
    });
  if (!entitled) return { entitled: false };

  const pages = getDocumentPages(record);
  if (!pages) return { entitled: false };

  const agent = new AtpAgent({
    service: "https://public.api.bsky.app",
    fetch: (...args) =>
      fetch(args[0], { ...args[1], next: { revalidate: 3600 } }),
  });
  const { bskyPostData, standardSitePostData, pollData } =
    await collectAndFetchBlockResources({
      agent,
      pages: pages as Parameters<
        typeof collectAndFetchBlockResources
      >[0]["pages"],
      skipCodeBlocks: true,
    });

  return {
    entitled: true,
    pages,
    // Mirrors DocumentPageRenderer's round-trip so the client merges shapes
    // identical to the ones the page shipped (the agent's post views carry
    // undefined-valued keys that RSC serialization otherwise preserves).
    bskyPostData: JSON.parse(JSON.stringify(bskyPostData)),
    standardSitePostData: JSON.parse(JSON.stringify(standardSitePostData)),
    pollData,
  };
}
