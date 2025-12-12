"use client";

import React from "react";
import { useUIState } from "src/useUIState";
import { useSearchParams } from "next/navigation";

import { useEntity } from "src/replicache";

import { useCardBorderHidden } from "./useCardBorderHidden";
import { BookendSpacer, SandwichSpacer } from "components/LeafletLayout";
import { LeafletSidebar } from "app/[leaflet_id]/Sidebar";
import { Page } from "./Page";

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
      {pages.map((page) => (
        <React.Fragment key={page}>
          <SandwichSpacer
            onClick={(e) => {
              e.currentTarget === e.target && blurPage();
            }}
          />
          <Page entityID={page} fullPageScroll={false} />
        </React.Fragment>
      ))}
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
