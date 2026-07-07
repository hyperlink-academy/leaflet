import { AtpAgent } from "@atproto/api";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { Suspense } from "react";
import { QuoteHandler } from "./QuoteHandler";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { getPostPageData } from "./getPostPageData";
import { PostPages } from "./PostPages";
import { collectAndFetchBlockResources } from "./collectAndFetchBlockResources";
import { LeafletLayout } from "components/LeafletLayout";
import { getDocumentPages } from "src/utils/normalizeRecords";
import { DocumentProvider } from "contexts/DocumentContext";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
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
}: {
  did: string;
  rkey: string;
  publication?: string;
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

  console.log("-------------");
  console.log(document?.data, record, pages);
  console.log("-------------");

  if (!document?.data || !record || !pages)
    return (
      <div className="bg-bg-leaflet h-full p-3 text-center relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full">
          <div className=" px-3 py-4 opaque-container  flex flex-col gap-1 mx-2 ">
            <h3>Sorry, post not found!</h3>
            <p>
              This may be a glitch on our end. If the issue persists please{" "}
              <a href="mailto:contact@leaflet.pub">send us a note</a>.
            </p>
          </div>
        </div>
      </div>
    );

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
    pollData,
    prerenderedCodeBlocks,
  } = await collectAndFetchBlockResources({
    agent,
    pages: pages as (
      | PubLeafletPagesLinearDocument.Main
      | PubLeafletPagesCanvas.Main
    )[],
  });

  const pubRecord = document.normalizedPublication;
  let pub_creator = document.publication?.identity_did || did;
  let isStandalone = !pubRecord;

  return (
    <DocumentProvider value={document}>
      <LeafletContentProvider value={{ pages }}>
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
                bskyPostData={JSON.parse(JSON.stringify(bskyPostData))}
                standardSitePostData={JSON.parse(
                  JSON.stringify(standardSitePosts),
                )}
                did={did}
                prerenderedCodeBlocks={prerenderedCodeBlocks}
                pollData={pollData}
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
      </LeafletContentProvider>
    </DocumentProvider>
  );
}
