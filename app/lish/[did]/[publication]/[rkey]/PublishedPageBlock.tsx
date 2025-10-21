"use client";

import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { CSSProperties, useContext, useRef } from "react";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { PostContent } from "./PostContent";
import {
  PubLeafletBlocksHeader,
  PubLeafletBlocksText,
  PubLeafletComment,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { AppBskyFeedDefs } from "@atproto/api";
import { TextBlock } from "./TextBlock";
import { PostPageContext } from "./PostPageContext";
import { openPage, useOpenPages } from "./PostPages";
import {
  openInteractionDrawer,
  setInteractionState,
  useInteractionState,
} from "./Interactions/Interactions";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";

export function PublishedPageLinkBlock(props: {
  blocks: PubLeafletPagesLinearDocument.Block[];
  parentPageId: string | undefined;
  pageId: string;
  did: string;
  preview?: boolean;
  className?: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
}) {
  //switch to use actually state
  let openPages = useOpenPages();
  let isOpen = openPages.includes(props.pageId);
  return (
    <div
      className={`w-full cursor-pointer
        pageLinkBlockWrapper relative group/pageLinkBlock
        bg-bg-page shadow-sm
        flex overflow-clip
        block-border
        mt-1 mb-2
        ${isOpen && "!border-tertiary"}
        ${props.className}
        `}
      onClick={(e) => {
        if (e.isDefaultPrevented()) return;
        if (e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();

        openPage(props.parentPageId, props.pageId);
      }}
    >
      <DocLinkBlock {...props} />
    </div>
  );
}
export function DocLinkBlock(props: {
  blocks: PubLeafletPagesLinearDocument.Block[];
  pageId: string;
  parentPageId?: string;
  did: string;
  preview?: boolean;
  className?: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
}) {
  let [title, description] = props.blocks
    .map((b) => b.block)
    .filter(
      (b) => PubLeafletBlocksText.isMain(b) || PubLeafletBlocksHeader.isMain(b),
    );

  return (
    <div
      style={{ "--list-marker-width": "20px" } as CSSProperties}
      className={`
        w-full h-[104px]
        `}
    >
      <>
        <div className="pageLinkBlockContent w-full flex overflow-clip cursor-pointer h-full">
          <div className="my-2 ml-3 grow min-w-0 text-sm bg-transparent overflow-clip flex flex-col ">
            <div className="grow">
              {title && (
                <div
                  className={`pageBlockOne outline-none resize-none align-top flex gap-2 ${title.$type === "pub.leaflet.blocks.header" ? "font-bold text-base" : ""}`}
                >
                  <TextBlock
                    facets={title.facets}
                    plaintext={title.plaintext}
                    index={[]}
                    preview
                  />
                </div>
              )}
              {description && (
                <div
                  className={`pageBlockLineTwo outline-none resize-none align-top flex  gap-2 ${description.$type === "pub.leaflet.blocks.header" ? "font-bold" : ""}`}
                >
                  <TextBlock
                    facets={description.facets}
                    plaintext={description.plaintext}
                    index={[]}
                    preview
                  />
                </div>
              )}
            </div>

            <Interactions
              pageId={props.pageId}
              parentPageId={props.parentPageId}
            />
          </div>
          {!props.preview && (
            <PagePreview blocks={props.blocks} did={props.did} />
          )}
        </div>
      </>
    </div>
  );
}

export function PagePreview(props: {
  did: string;
  blocks: PubLeafletPagesLinearDocument.Block[];
}) {
  let previewRef = useRef<HTMLDivElement | null>(null);
  let { rootEntity } = useReplicache();
  let data = useContext(PostPageContext);
  let theme = data?.documents_in_publications[0]?.publications
    ?.record as PubLeafletPublication.Record;
  let pageWidth = `var(--page-width-unitless)`;
  let cardBorderHidden = !theme.theme?.showPageBackground;
  return (
    <div
      ref={previewRef}
      className={`pageLinkBlockPreview w-[120px] overflow-clip  mx-3 mt-3 -mb-2  border rounded-md shrink-0 border-border-light flex flex-col gap-0.5 rotate-[4deg] origin-center ${cardBorderHidden ? "" : "bg-bg-page"}`}
    >
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none "
        style={{
          width: `calc(1px * ${pageWidth})`,
          height: `calc(100vh - 64px)`,
          transform: `scale(calc((120 / ${pageWidth} )))`,
          backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
        }}
      >
        {!cardBorderHidden && (
          <div
            className={`pageLinkBlockBackground
            absolute top-0 left-0 right-0 bottom-0
            pointer-events-none
            `}
          />
        )}
        <PostContent
          pages={[]}
          did={props.did}
          blocks={props.blocks}
          preview
          bskyPostData={[]}
        />
      </div>
    </div>
  );
}

const Interactions = (props: { pageId: string; parentPageId?: string }) => {
  const data = useContext(PostPageContext);
  const document_uri = data?.uri;
  if (!document_uri)
    throw new Error("document_uri not available in PostPageContext");
  let comments = data.comments_on_documents.filter(
    (c) => (c.record as PubLeafletComment.Record)?.onPage === props.pageId,
  ).length;
  let quotes = data.document_mentions_in_bsky.filter((q) =>
    q.link.includes(props.pageId),
  ).length;

  let { drawerOpen, drawer, pageId } = useInteractionState(document_uri);

  return (
    <div
      className={`flex gap-2 text-tertiary text-sm absolute bottom-2 bg-bg-page`}
    >
      {quotes > 0 && (
        <button
          className={`flex gap-1 items-center`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openPage(props.parentPageId, props.pageId, {
              scrollIntoView: false,
            });
            if (!drawerOpen || drawer !== "quotes")
              openInteractionDrawer("quotes", document_uri, props.pageId);
            else setInteractionState(document_uri, { drawerOpen: false });
          }}
          aria-label="Page quotes"
        >
          <QuoteTiny aria-hidden /> {quotes}{" "}
        </button>
      )}
      {comments > 0 && (
        <button
          className={`flex gap-1 items-center`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openPage(props.parentPageId, props.pageId, {
              scrollIntoView: false,
            });
            if (!drawerOpen || drawer !== "comments" || pageId !== props.pageId)
              openInteractionDrawer("comments", document_uri, props.pageId);
            else setInteractionState(document_uri, { drawerOpen: false });
          }}
          aria-label="Page comments"
        >
          <CommentTiny aria-hidden /> {comments}{" "}
        </button>
      )}
    </div>
  );
};
