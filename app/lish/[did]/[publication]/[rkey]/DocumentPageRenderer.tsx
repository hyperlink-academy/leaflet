import { AtpAgent } from "@atproto/api";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksBskyPost,
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
import { extractCodeBlocks } from "./extractCodeBlocks";
import { LeafletLayout } from "components/LeafletLayout";
import { fetchPollData } from "./fetchPollData";
import {
  getDocumentPages,
  hasLeafletContent,
} from "src/utils/normalizeRecords";
import { DocumentProvider } from "contexts/DocumentContext";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { mergePreferences } from "src/utils/mergePreferences";

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
    agent.getProfile({ actor: did }),
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
  let bskyPosts =
    pages.flatMap((p) => {
      let page = p as PubLeafletPagesLinearDocument.Main;
      return page.blocks?.filter(
        (b) => b.block.$type === ids.PubLeafletBlocksBskyPost,
      );
    }) || [];

  // Batch bsky posts into groups of 25 and fetch in parallel
  let bskyPostBatches = [];
  for (let i = 0; i < bskyPosts.length; i += 25) {
    bskyPostBatches.push(bskyPosts.slice(i, i + 25));
  }

  let bskyPostResponses = await Promise.all(
    bskyPostBatches.map((batch) =>
      agent.getPosts(
        {
          uris: batch.map((p) => {
            let block = p?.block as PubLeafletBlocksBskyPost.Main;
            return block.postRef.uri;
          }),
        },
        { headers: {} },
      ),
    ),
  );

  let bskyPostData =
    bskyPostResponses.length > 0
      ? bskyPostResponses.flatMap((response) => response.data.posts)
      : [];

  // Extract poll blocks and fetch vote data
  let pollBlocks = pages.flatMap((p) => {
    let page = p as PubLeafletPagesLinearDocument.Main;
    return (
      page.blocks?.filter((b) => b.block.$type === ids.PubLeafletBlocksPoll) ||
      []
    );
  });
  let pollData = await fetchPollData(
    pollBlocks.map((b) => (b.block as any).pollRef.uri),
  );

  const pubRecord = document.normalizedPublication;
  let pub_creator = document.publication?.identity_did || did;
  let isStandalone = !pubRecord;

  let firstPage = pages[0];
  let firstPageBlocks =
    (
      firstPage as
        | PubLeafletPagesLinearDocument.Main
        | PubLeafletPagesCanvas.Main
    ).blocks || [];
  let prerenderedCodeBlocks = await extractCodeBlocks(firstPageBlocks);

  return (
    <DocumentProvider value={document}>
      <LeafletContentProvider value={{ pages }}>
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
              <PostPages
                document_uri={document.uri}
                preferences={mergePreferences(record?.preferences, pubRecord?.preferences)}
                pubRecord={pubRecord}
                profile={JSON.parse(JSON.stringify(profile.data))}
                document={document}
                bskyPostData={JSON.parse(JSON.stringify(bskyPostData))}
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
