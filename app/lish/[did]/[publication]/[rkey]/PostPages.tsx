"use client";
import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { EditTiny } from "components/Icons/EditTiny";
import { Interactions, useInteractionState } from "./Interactions/Interactions";
import { PostContent } from "./PostContent";
import { PostHeader } from "./PostHeader/PostHeader";
import { useIdentityData } from "components/IdentityProvider";
import { AppBskyFeedDefs } from "@atproto/api";
import { create } from "zustand/react";
import { InteractionDrawer } from "./Interactions/InteractionDrawer";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { CSS } from "@react-spring/web";
import { PageOptionButton } from "components/Pages/PageOptions";
import { CloseTiny } from "components/Icons/CloseTiny";
import { PageWrapper } from "components/Pages/Page";
export const usePostPageUIState = create(() => ({
  pages: [] as string[],
}));

export const openPage = (parent: string | undefined, page: string) =>
  usePostPageUIState.setState((state) => {
    let parentPosition = state.pages.findIndex((s) => s == parent);
    return {
      pages:
        parentPosition === -1
          ? [page]
          : [...state.pages.slice(0, parentPosition + 1), page],
    };
  });

export const closePage = (page: string) =>
  usePostPageUIState.setState((state) => {
    let parentPosition = state.pages.findIndex((s) => s == page);
    return {
      pages: state.pages.slice(0, parentPosition),
    };
  });

export function PostPages({
  document,
  blocks,
  name,
  did,
  profile,
  preferences,
  pubRecord,
  prerenderedCodeBlocks,
  bskyPostData,
}: {
  document: PostPageData;
  blocks: PubLeafletPagesLinearDocument.Block[];
  name: string;
  profile: ProfileViewDetailed;
  pubRecord: PubLeafletPublication.Record;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  preferences: { showComments?: boolean };
}) {
  let { identity } = useIdentityData();
  let { drawerOpen } = useInteractionState();
  let pages = usePostPageUIState((s) => s.pages);
  if (!document || !document.documents_in_publications[0].publications)
    return null;

  let hasPageBackground = !!pubRecord.theme?.showPageBackground;
  let fullPageScroll = !hasPageBackground && !drawerOpen && pages.length === 0;
  return (
    <>
      {!fullPageScroll && <BookendSpacer />}
      <PageWrapper
        fullPageScroll={fullPageScroll}
        cardBorderHidden={!hasPageBackground}
        id={"post-page"}
      >
        <PostHeader
          data={document}
          profile={profile}
          name={name}
          preferences={preferences}
        />
        <PostContent
          bskyPostData={bskyPostData}
          blocks={blocks}
          did={did}
          prerenderedCodeBlocks={prerenderedCodeBlocks}
        />
        <Interactions
          showComments={preferences.showComments}
          quotesCount={document.document_mentions_in_bsky.length}
          commentsCount={document.comments_on_documents.length}
        />
        <hr className="border-border-light mb-4 mt-4 sm:mx-4 mx-3" />
        <div className="pb-6 sm:px-4 px-3">
          {identity &&
          identity.atp_did ===
            document.documents_in_publications[0]?.publications
              ?.identity_did ? (
            <a
              href={`https://leaflet.pub/${document.leaflets_in_publications[0]?.leaflet}`}
              className="flex gap-2 items-center hover:!no-underline selected-outline px-2 py-0.5 bg-accent-1 text-accent-2 font-bold w-fit rounded-lg !border-accent-1 !outline-accent-1 mx-auto"
            >
              <EditTiny /> Edit Post
            </a>
          ) : (
            <SubscribeWithBluesky
              isPost
              base_url={getPublicationURL(
                document.documents_in_publications[0].publications,
              )}
              pub_uri={document.documents_in_publications[0].publications.uri}
              subscribers={
                document.documents_in_publications[0].publications
                  .publication_subscriptions
              }
              pubName={name}
            />
          )}
        </div>
      </PageWrapper>

      {drawerOpen && (
        <InteractionDrawer
          document_uri={document.uri}
          comments={
            pubRecord.preferences?.showComments === false
              ? []
              : document.comments_on_documents
          }
          quotes={document.document_mentions_in_bsky}
          did={did}
        />
      )}

      {pages.map((p) => {
        let record = document.data as PubLeafletDocument.Record;
        let page = record.pages.find(
          (page) => (page as PubLeafletPagesLinearDocument.Main).id === p,
        ) as PubLeafletPagesLinearDocument.Main | undefined;
        if (!page) return null;
        return (
          <>
            <SandwichSpacer />
            <PageWrapper
              cardBorderHidden={!hasPageBackground}
              id={"post-page"}
              fullPageScroll={false}
              pageOptions={
                <PageOptions
                  onClick={() => closePage(page?.id!)}
                  hasPageBackground={hasPageBackground}
                />
              }
            >
              <PostContent
                pageId={page.id}
                bskyPostData={bskyPostData}
                blocks={page.blocks}
                did={did}
                prerenderedCodeBlocks={prerenderedCodeBlocks}
              />
            </PageWrapper>
          </>
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
