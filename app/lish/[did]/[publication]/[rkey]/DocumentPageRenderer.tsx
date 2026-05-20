import { AtpAgent } from "@atproto/api";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
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
import { PublicationNav } from "../PublicationNav";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

export async function DocumentPageRenderer({
  did,
  rkey,
}: {
  did: string;
  rkey: string;
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
    getPostPageData(did, rkey),
    agent.getProfile({ actor: did }).then(
      (res) => res.data,
      () => undefined,
    ),
  ]);

  const record = document?.normalizedDocument;
  const pages = record ? getDocumentPages(record) : undefined;

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
          theme={document.theme}
          pub_creator={pub_creator}
          isStandalone={isStandalone}
        >
          <PublicationBackgroundProvider
            theme={document.theme}
            pub_creator={pub_creator}
          >
            <LeafletLayout>
              {document.publication?.pages?.length ? (
                <PublicationNav
                  publicationUrl={getPublicationURL(document.publication)}
                  pages={document.publication.pages}
                  activePath={null}
                />
              ) : null}
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
                document={document}
                bskyPostData={JSON.parse(JSON.stringify(bskyPostData))}
                standardSitePostData={JSON.parse(
                  JSON.stringify(standardSitePosts),
                )}
                did={did}
                prerenderedCodeBlocks={prerenderedCodeBlocks}
                pollData={pollData}
              />
            </LeafletLayout>

            <QuoteHandler />
          </PublicationBackgroundProvider>
        </PublicationThemeProvider>
      </LeafletContentProvider>
    </DocumentProvider>
  );
}
