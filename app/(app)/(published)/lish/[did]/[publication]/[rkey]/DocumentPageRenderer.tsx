import { AtpAgent } from "@atproto/api";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { QuoteHandler } from "./QuoteHandler";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { getPostPageData } from "src/utils/getPostPageData";
import { PostPages } from "./PostPages";
import { collectAndFetchBlockResources } from "./collectAndFetchBlockResources";
import { LeafletLayout } from "components/LeafletLayout";
import { getDocumentPages } from "src/utils/normalizeRecords";
import { PostDataProvider } from "./PostDataProvider";
import { FontLoader } from "components/FontLoader";
import { mergePreferences } from "src/utils/mergePreferences";
import { CommentsSection } from "./Interactions/Comments/CommentsSection";
import { getProfiles } from "src/identity/profileCache";
import {
  getBylineDids,
  hasExplicitByline,
  toBylineProfiles,
} from "src/utils/byline";

export async function DocumentPageRenderer({
  did,
  rkey,
  publication,
  openPageId,
}: {
  did: string;
  rkey: string;
  publication?: string;
  openPageId?: string;
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

  if (!document?.data || !record || !pages) notFound();

  // Resolve byline contributors. When the document has a non-empty
  // `contributors` array, render those profiles; otherwise fall back to the
  // single document author (the host DID of the document URI). When the byline
  // is just the author we leave `contributors` undefined so PostHeader uses its
  // existing single-`profile` render path (byte-for-byte the same as before).
  let contributorProfiles;
  if (hasExplicitByline(record, did)) {
    const bylineDids = getBylineDids(record, did);
    contributorProfiles = toBylineProfiles(
      bylineDids,
      await getProfiles(bylineDids),
    );
  }

  const {
    bskyPostData,
    standardSitePostData: standardSitePosts,
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
  });

  const pubRecord = document.normalizedPublication;
  let pub_creator = document.publication?.identity_did || did;
  let isStandalone = !pubRecord;

  return (
    <PostDataProvider
      document={document}
      initial={{
        pages,
        bskyPostData: JSON.parse(JSON.stringify(bskyPostData)),
        standardSitePostData: JSON.parse(JSON.stringify(standardSitePosts)),
        standardSitePublicationData: JSON.parse(
          JSON.stringify(standardSitePublicationData),
        ),
        pollData,
      }}
    >
      <FontLoader
        headingFontId={document.theme?.headingFont}
        bodyFontId={document.theme?.bodyFont}
      />
      <PublicationThemeProvider
        record={{ theme: document.theme }}
        pub_creator={pub_creator}
        isStandalone={isStandalone}
      >
        <PublicationBackgroundProvider
          record={{ theme: document.theme }}
          pub_creator={pub_creator}
        >
          <LeafletLayout>
            <PostPages
              document_uri={document.uri}
              preferences={mergePreferences(
                record?.preferences,
                pubRecord?.preferences,
              )}
              pubRecord={pubRecord}
              profile={
                profile ? JSON.parse(JSON.stringify(profile)) : undefined
              }
              contributors={contributorProfiles}
              document={document}
              did={did}
              prerenderedCodeBlocks={prerenderedCodeBlocks}
              commentsSlot={
                <Suspense fallback={null}>
                  <CommentsSection document_uri={document.uri} />
                </Suspense>
              }
            />
          </LeafletLayout>

          <QuoteHandler />
        </PublicationBackgroundProvider>
      </PublicationThemeProvider>
    </PostDataProvider>
  );
}
