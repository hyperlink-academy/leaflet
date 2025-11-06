"use client";
import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AppBskyFeedDefs } from "@atproto/api";
import { create } from "zustand/react";
import {
  InteractionDrawer,
  useDrawerOpen,
} from "./Interactions/InteractionDrawer";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { PageOptionButton } from "components/Pages/PageOptions";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Fragment, useEffect } from "react";
import { flushSync } from "react-dom";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { useParams } from "next/navigation";
import { decodeQuotePosition } from "./quotePosition";
import { PollData } from "./fetchPollData";
import { LinearDocumentPage } from "./LinearDocumentPage";
import { CanvasPage } from "./CanvasPage";

const usePostPageUIState = create(() => ({
  pages: [] as string[],
  initialized: false,
}));

export const useOpenPages = () => {
  const { quote } = useParams();
  const state = usePostPageUIState((s) => s);

  if (!state.initialized && quote) {
    const decodedQuote = decodeQuotePosition(quote as string);
    if (decodedQuote?.pageId) {
      return [decodedQuote.pageId];
    }
  }

  return state.pages;
};

export const useInitializeOpenPages = () => {
  const { quote } = useParams();

  useEffect(() => {
    const state = usePostPageUIState.getState();
    if (!state.initialized) {
      if (quote) {
        const decodedQuote = decodeQuotePosition(quote as string);
        if (decodedQuote?.pageId) {
          usePostPageUIState.setState({
            pages: [decodedQuote.pageId],
            initialized: true,
          });
          return;
        }
      }
      // Mark as initialized even if no pageId found
      usePostPageUIState.setState({ initialized: true });
    }
  }, [quote]);
};

export const openPage = (
  parent: string | undefined,
  page: string,
  options?: { scrollIntoView?: boolean },
) => {
  flushSync(() => {
    usePostPageUIState.setState((state) => {
      let parentPosition = state.pages.findIndex((s) => s == parent);
      return {
        pages:
          parentPosition === -1
            ? [page]
            : [...state.pages.slice(0, parentPosition + 1), page],
        initialized: true,
      };
    });
  });

  if (options?.scrollIntoView !== false) {
    scrollIntoView(`post-page-${page}`);
  }
};

export const closePage = (page: string) =>
  usePostPageUIState.setState((state) => {
    let parentPosition = state.pages.findIndex((s) => s == page);
    return {
      pages: state.pages.slice(0, parentPosition),
      initialized: true,
    };
  });

export function PostPages({
  document,
  blocks,
  did,
  profile,
  preferences,
  pubRecord,
  prerenderedCodeBlocks,
  bskyPostData,
  document_uri,
  pollData,
}: {
  document_uri: string;
  document: PostPageData;
  blocks: PubLeafletPagesLinearDocument.Block[];
  profile: ProfileViewDetailed;
  pubRecord: PubLeafletPublication.Record;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  preferences: { showComments?: boolean };
  pollData: PollData[];
}) {
  let drawer = useDrawerOpen(document_uri);
  useInitializeOpenPages();
  let pages = useOpenPages();
  if (!document || !document.documents_in_publications[0].publications)
    return null;

  let hasPageBackground = !!pubRecord.theme?.showPageBackground;
  let record = document.data as PubLeafletDocument.Record;
  let quotesAndMentions = document.quotesAndMentions;

  let fullPageScroll = !hasPageBackground && !drawer && pages.length === 0;
  return (
    <>
      {!fullPageScroll && <BookendSpacer />}
      <LinearDocumentPage
        document={document}
        blocks={blocks}
        did={did}
        profile={profile}
        fullPageScroll={fullPageScroll}
        pollData={pollData}
        preferences={preferences}
        pubRecord={pubRecord}
        prerenderedCodeBlocks={prerenderedCodeBlocks}
        bskyPostData={bskyPostData}
        document_uri={document_uri}
      />

      {drawer && !drawer.pageId && (
        <InteractionDrawer
          document_uri={document.uri}
          comments={
            pubRecord.preferences?.showComments === false
              ? []
              : document.comments_on_documents
          }
          quotesAndMentions={quotesAndMentions}
          did={did}
        />
      )}

      {pages.map((p) => {
        let page = record.pages.find(
          (page) =>
            (
              page as
                | PubLeafletPagesLinearDocument.Main
                | PubLeafletPagesCanvas.Main
            ).id === p,
        ) as
          | PubLeafletPagesLinearDocument.Main
          | PubLeafletPagesCanvas.Main
          | undefined;
        if (!page) return null;

        const isCanvas = PubLeafletPagesCanvas.isMain(page);

        return (
          <Fragment key={p}>
            <SandwichSpacer />
            {isCanvas ? (
              <CanvasPage
                fullPageScroll={false}
                document={document}
                blocks={(page as PubLeafletPagesCanvas.Main).blocks}
                did={did}
                preferences={preferences}
                profile={profile}
                pubRecord={pubRecord}
                prerenderedCodeBlocks={prerenderedCodeBlocks}
                pollData={pollData}
                bskyPostData={bskyPostData}
                document_uri={document_uri}
                pageId={page.id}
                pages={record.pages as PubLeafletPagesLinearDocument.Main[]}
                pageOptions={
                  <PageOptions
                    onClick={() => closePage(page?.id!)}
                    hasPageBackground={hasPageBackground}
                  />
                }
              />
            ) : (
              <LinearDocumentPage
                fullPageScroll={false}
                document={document}
                blocks={(page as PubLeafletPagesLinearDocument.Main).blocks}
                did={did}
                preferences={preferences}
                pubRecord={pubRecord}
                pollData={pollData}
                prerenderedCodeBlocks={prerenderedCodeBlocks}
                bskyPostData={bskyPostData}
                document_uri={document_uri}
                pageId={page.id}
                pageOptions={
                  <PageOptions
                    onClick={() => closePage(page?.id!)}
                    hasPageBackground={hasPageBackground}
                  />
                }
              />
            )}
            {drawer && drawer.pageId === page.id && (
              <InteractionDrawer
                pageId={page.id}
                document_uri={document.uri}
                comments={
                  pubRecord.preferences?.showComments === false
                    ? []
                    : document.comments_on_documents
                }
                quotesAndMentions={quotesAndMentions}
                did={did}
              />
            )}
          </Fragment>
        );
      })}
      {!fullPageScroll && <BookendSpacer />}
    </>
  );
}

const PageOptions = (props: {
  onClick: () => void;
  hasPageBackground: boolean;
}) => {
  return (
    <div
      className={`pageOptions w-fit z-10
      absolute sm:-right-[20px] right-3 sm:top-3 top-0
      flex sm:flex-col flex-row-reverse gap-1 items-start`}
    >
      <PageOptionButton
        cardBorderHidden={!props.hasPageBackground}
        onClick={props.onClick}
      >
        <CloseTiny />
      </PageOptionButton>
    </div>
  );
};
