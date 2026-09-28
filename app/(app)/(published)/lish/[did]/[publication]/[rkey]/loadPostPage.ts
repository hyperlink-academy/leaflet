import { AtpAgent } from "@atproto/api";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { getPostPageData } from "src/utils/getPostPageData";
import { getDocumentPages } from "src/utils/normalizeRecords";
import { getProfiles } from "src/identity/profileCache";
import {
  getBylineDids,
  hasExplicitByline,
  toBylineProfiles,
  type BylineProfile,
} from "src/utils/byline";
import { collectAndFetchBlockResources } from "./collectAndFetchBlockResources";

export type LoadedPostPage = NonNullable<
  Awaited<ReturnType<typeof loadPostPage>>
>;

// Everything PostPageShell needs to render a post, in shapes that survive
// serialization: the published route renders it in place, the reader ships it
// through a server action and renders the same shell client-side.
export async function loadPostPage({
  did,
  rkey,
  publication,
  openPageId,
  skipCodeBlocks,
}: {
  did: string;
  rkey: string;
  publication?: string;
  openPageId?: string;
  skipCodeBlocks?: boolean;
}) {
  let agent = new AtpAgent({
    service: "https://public.api.bsky.app",
    fetch: (...args) =>
      fetch(args[0], {
        ...args[1],
        next: { revalidate: 3600 },
      }),
  });

  let [document, profile] = await Promise.all([
    getPostPageData(did, rkey, publication),
    agent.getProfile({ actor: did }).then(
      (res) => res.data,
      () => undefined,
    ),
  ]);

  const record = document?.normalizedDocument;
  const pages = record ? getDocumentPages(record) : undefined;
  if (!document?.data || !record || !pages) return null;

  // Resolve byline contributors. When the document has a non-empty
  // `contributors` array, render those profiles; otherwise fall back to the
  // single document author (the host DID of the document URI). When the byline
  // is just the author we leave `contributors` undefined so PostHeader uses its
  // existing single-`profile` render path (byte-for-byte the same as before).
  let contributorProfiles: BylineProfile[] | undefined;
  if (hasExplicitByline(record, did)) {
    const bylineDids = getBylineDids(record, did);
    contributorProfiles = toBylineProfiles(
      bylineDids,
      await getProfiles(bylineDids),
    );
  }

  const {
    bskyPostData,
    standardSitePostData,
    standardSitePublicationData,
    pollData,
    prerenderedCodeBlocks,
  } = await collectAndFetchBlockResources({
    agent,
    pages: pages as (
      | PubLeafletPagesLinearDocument.Main
      | PubLeafletPagesCanvas.Main
    )[],
    openPageId,
    skipCodeBlocks,
  });

  return {
    did,
    document,
    pages,
    profile: profile
      ? (JSON.parse(JSON.stringify(profile)) as typeof profile)
      : undefined,
    contributorProfiles,
    resources: {
      pages,
      bskyPostData: JSON.parse(
        JSON.stringify(bskyPostData),
      ) as typeof bskyPostData,
      standardSitePostData: JSON.parse(
        JSON.stringify(standardSitePostData),
      ) as typeof standardSitePostData,
      standardSitePublicationData: JSON.parse(
        JSON.stringify(standardSitePublicationData),
      ) as typeof standardSitePublicationData,
      pollData,
    },
    prerenderedCodeBlocks,
  };
}
