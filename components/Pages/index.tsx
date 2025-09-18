"use client";

import React from "react";
import { useUIState } from "src/useUIState";
import { useSearchParams } from "next/navigation";

import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";

import { Replicache } from "replicache";
import { Fact, ReplicacheMutators, useEntity } from "src/replicache";

import { scanIndex } from "src/replicache/utils";
import { CardThemeProvider } from "../ThemeManager/ThemeProvider";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";
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

  let fullPageScroll = !!cardBorderHidden && pages.length === 0;

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

export async function focusPage(
  pageID: string,
  rep: Replicache<ReplicacheMutators>,
  focusFirstBlock?: "focusFirstBlock",
) {
  // if this page is already focused,
  let focusedBlock = useUIState.getState().focusedEntity;
  // else set this page as focused
  useUIState.setState(() => ({
    focusedEntity: {
      entityType: "page",
      entityID: pageID,
    },
  }));

  setTimeout(async () => {
    //scroll to page

    scrollIntoViewIfNeeded(
      document.getElementById(elementId.page(pageID).container),
      false,
      "smooth",
    );

    // if we asked that the function focus the first block, focus the first block
    if (focusFirstBlock === "focusFirstBlock") {
      let firstBlock = await rep.query(async (tx) => {
        let type = await scanIndex(tx).eav(pageID, "page/type");
        let blocks = await scanIndex(tx).eav(
          pageID,
          type[0]?.data.value === "canvas" ? "canvas/block" : "card/block",
        );

        let firstBlock = blocks[0];

        if (!firstBlock) {
          return null;
        }

        let blockType = (
          await tx
            .scan<
              Fact<"block/type">
            >({ indexName: "eav", prefix: `${firstBlock.data.value}-block/type` })
            .toArray()
        )[0];

        if (!blockType) return null;

        return {
          value: firstBlock.data.value,
          type: blockType.data.value,
          parent: firstBlock.entity,
          position: firstBlock.data.position,
        };
      });

      if (firstBlock) {
        setTimeout(() => {
          focusBlock(firstBlock, { type: "start" });
        }, 500);
      }
    }
  }, 50);
}

export const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
