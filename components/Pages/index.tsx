"use client";

import React from "react";
import { useUIState, getEditorPageKey } from "src/useUIState";
import { useSearchParams } from "next/navigation";

import { useEntity } from "src/replicache";

import { useCardBorderHidden } from "./useCardBorderHidden";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { LeafletSidebar } from "app/[leaflet_id]/Sidebar";
import { Page } from "./Page";
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
  let cardBorderHidden = useCardBorderHidden(rootPage.id);
  let firstPageIsCanvas = useEntity(firstPage, "page/type");
  let fullPageScroll =
    !!cardBorderHidden && pages.length === 0 && !firstPageIsCanvas;

  return (
    <>
      <LeafletSidebar />
      {!fullPageScroll && (
        <BookendSpacer
          onClick={(e) => {
            e.currentTarget === e.target && blurPage();
          }}
        />
      )}

      <Page entityID={firstPage} first fullPageScroll={fullPageScroll} />
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
            <Page entityID={page} fullPageScroll={false} />
          </React.Fragment>
        );
      })}
      {!fullPageScroll && (
        <BookendSpacer
          onClick={(e) => {
            e.currentTarget === e.target && blurPage();
          }}
        />
      )}
    </>
  );
}

const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
