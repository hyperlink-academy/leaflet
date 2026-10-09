"use client";

import React, { useEffect } from "react";
import { useUIState, getEditorPageKey } from "src/useUIState";
import { useSearchParams } from "next/navigation";

import { useEntity, useReplicache } from "src/replicache";
import { useIsMobile } from "src/hooks/isMobile";
import { useDrawerOpen } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/useDrawerOpen";
import { setInteractionState } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/Interactions";
import { isBskyThread } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";

import { useCardBorderHidden } from "./useCardBorderHidden";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { LeafletSidebar } from "app/(app)/(editor)/[leaflet_id]/Sidebar";
import { Page } from "./Page";
import { ListDndProvider } from "components/Blocks/ListDnd";
import { IframePageView } from "./IframePageView";
import { PageOptionButton } from "./PageOptions";
import { CloseTiny } from "components/Icons/CloseTiny";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";

export function Pages(props: { rootPage: string }) {
  let rootPage = useEntity(props.rootPage, "root/page")[0];
  let pages = useUIState((s) => s.openPages);
  let params = useSearchParams();
  let queryRoot = params.get("page");
  let firstPage = queryRoot || rootPage?.data.value || props.rootPage;
  let cardBorderHidden = useCardBorderHidden(rootPage?.id);
  let firstPageIsCanvas = useEntity(firstPage, "page/type");

  // The leaflet's interaction state is keyed by its root entity, with the
  // drawer attached to one page at a time. As on a published post, the first
  // page is the one with no page id, unless ?page= names it: a drawer restored
  // from the URL resolves its page from that param.
  let { rootEntity } = useReplicache();
  let isMobile = useIsMobile();
  let drawer = useDrawerOpen(rootEntity);
  let drawerPageId = (page: string) =>
    page === firstPage && !queryRoot ? undefined : page;
  let drawerPage =
    drawer && isBskyThread(drawer.thread)
      ? [firstPage, ...pages].find(
          (page): page is string =>
            typeof page === "string" && drawer.pageId === drawerPageId(page),
        )
      : undefined;
  let threadDrawer = (page: string) => ({
    pageId: drawerPageId(page),
    inline: !isMobile && page === drawerPage,
  });
  // Left open on a page that has since closed, or restored from the URL onto a
  // view the editor can't show.
  let staleDrawer = !!drawer && !drawerPage;
  useEffect(() => {
    if (staleDrawer) setInteractionState(rootEntity, { drawerOpen: false });
  }, [staleDrawer, rootEntity]);
  let inlineDrawer = !isMobile && !!drawerPage;

  let fullPageScroll =
    !!cardBorderHidden &&
    pages.length === 0 &&
    !firstPageIsCanvas &&
    !inlineDrawer;
  let loneCanvas =
    firstPageIsCanvas?.data.value === "canvas" &&
    pages.length === 0 &&
    !inlineDrawer;

  return (
    // One drag context above every open page, so list items can be dragged
    // between them (e.g. into an open subpage).
    <ListDndProvider>
      {fullPageScroll ? (
        <LeafletSidebar floating />
      ) : (
        <BookendSpacer
          shrink={loneCanvas}
          onClick={(e) => {
            e.currentTarget === e.target && blurPage();
          }}
        >
          <LeafletSidebar />
        </BookendSpacer>
      )}

      <Page
        entityID={firstPage}
        first
        fullPageScroll={fullPageScroll}
        threadDrawer={threadDrawer(firstPage)}
      />
      {pages.map((page) => {
        let key = getEditorPageKey(page);
        if (typeof page === "object") {
          return (
            <React.Fragment key={key}>
              <SandwichSpacer
                onClick={(e) => {
                  e.currentTarget === e.target && blurPage();
                }}
              />
              <IframePageView
                url={page.url}
                onOpen={(url) => {
                  useUIState
                    .getState()
                    .openPage(page, { type: "iframe", url });
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      scrollIntoViewIfNeeded(
                        document.getElementById(`iframe-page-${url}`),
                        false,
                        "smooth",
                        0.8,
                      );
                    });
                  });
                }}
                pageOptions={
                  <div className="pageOptions w-fit z-10 absolute sm:-right-[19px] right-3 sm:top-3 top-0 flex sm:flex-col flex-row-reverse gap-1 items-start">
                    <PageOptionButton
                      onClick={() =>
                        useUIState.getState().closePage(page)
                      }
                    >
                      <CloseTiny />
                    </PageOptionButton>
                  </div>
                }
              />
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={key}>
            <SandwichSpacer
              onClick={(e) => {
                e.currentTarget === e.target && blurPage();
              }}
            />
            <Page
              entityID={page}
              fullPageScroll={false}
              threadDrawer={threadDrawer(page)}
            />
          </React.Fragment>
        );
      })}
      {!fullPageScroll && (
        <BookendSpacer
          shrink={loneCanvas}
          onClick={(e) => {
            e.currentTarget === e.target && blurPage();
          }}
        />
      )}
    </ListDndProvider>
  );
}

const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
