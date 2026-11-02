"use client";

import React, { useEffect, useMemo } from "react";
import { useIsPageFocused, useUIState } from "src/useUIState";

import { elementId } from "src/utils/elementId";

import { useEntity, useReferenceToEntity, useReplicache } from "src/replicache";

import { DesktopPageFooter } from "../DesktopFooter";
import { Canvas } from "../Canvas";
import { Blocks } from "components/Blocks";
import { GoBackTiny } from "components/Icons/GoBackTiny";
import { addShortcut } from "src/shortcuts";
import { PublicationMetadata } from "./PublicationMetadata";
import { InlineVersionBanner } from "components/VersionBanner";
import { useLeafletPublicationPage } from "components/PageSWRDataProvider";
import { useCardBorderHidden } from "./useCardBorderHidden";
import { focusPage } from "src/utils/focusPage";
import { zoomIntoBlock } from "src/utils/zoomIntoBlock";
import { PageOptions } from "./PageOptions";
import { CardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { InteractionDrawer } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/InteractionDrawer";
import { openDrawerThread } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/Interactions";
import {
  type PostFrame,
  PostFrameProvider,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postFrame";
import { usePageFootnotes } from "components/Footnotes/usePageFootnotes";
import { FootnoteContext } from "components/Footnotes/FootnoteContext";
import { FootnoteSection } from "components/Footnotes/FootnoteSection";
import { FootnotePopover } from "components/Footnotes/FootnotePopover";
import { usePageEditorComments } from "components/EditorComments/usePageEditorComments";
import { EditorCommentContext } from "components/EditorComments/EditorCommentContext";
import { AnnotationSideColumn } from "components/EditorComments/AnnotationSideColumn";
import { EditorCommentMobileSheet } from "components/EditorComments/EditorCommentMobileSheet";
import { EditorCommentPopover } from "components/EditorComments/EditorCommentPopover";
import { EditorCommentAnchorHover } from "components/EditorComments/EditorCommentAnchorHover";
import { LinkPopover } from "components/LinkPopover";
import { CanvasPageArea } from "src/canvasZoom/CanvasPageScroll";
import { PageWrapper } from "./PageWrapper";

export function Page(props: {
  entityID: string;
  first?: boolean;
  fullPageScroll: boolean;
  header?: React.ReactNode;
  // The drawer this page's Bluesky posts open their threads in, from a host
  // that lays pages out in a row with room for one.
  threadDrawer?: { pageId: string | undefined; inline: boolean };
}) {
  let { rep, rootEntity } = useReplicache();
  let publicationPage = useLeafletPublicationPage();

  let zoomedBlock = useUIState((s) => s.zoomedBlocks[props.entityID]);

  let isFocused = useIsPageFocused(props.entityID);
  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";

  let drawer = props.threadDrawer;
  let hasDrawer = !!drawer;
  let drawerPageId = drawer?.pageId;
  // The drawer's other views (tags, post discussions, recommends) read a
  // published document the editor lacks, so blocks opt into the frame one at a
  // time with DrawerThreadPageProvider.
  let frame = useMemo<PostFrame | null>(
    () =>
      hasDrawer
        ? {
            drawer: true,
            headerInteractions: false,
            openPages: [],
            openPage: () => {},
            closePage: () => {},
            showPage: () => {},
            openDiscussion: () => {},
            toggleDiscussion: () => {},
            openThread: (thread) => {
              // The click that opens a thread also selects its block, which
              // would keep taking the keyboard from the drawer.
              useUIState.setState({ focusedEntity: null, selectedBlocks: [] });
              openDrawerThread(rootEntity, thread, drawerPageId);
            },
          }
        : null,
    [hasDrawer, rootEntity, drawerPageId],
  );
  let footnoteData = usePageFootnotes(props.entityID);
  let commentData = usePageEditorComments(props.entityID);
  let isRightmostPage = useUIState((s) => {
    let pages = s.openPages;
    if (pages.length === 0) return true;
    return pages[pages.length - 1] === props.entityID;
  });
  let sideColumnVisible =
    pageType === "doc" && !drawer?.inline && isRightmostPage;
  // A canvas below a publication header scrolls with the page and is as wide
  // as one, as a doc page is (src/canvasZoom/CanvasPageScroll.tsx).
  let canvasBelowHeader = !!props.header && pageType === "canvas";
  let cardBorderHidden = useCardBorderHidden();

  return (
    <CardThemeProvider entityID={props.entityID}>
      <FootnoteContext.Provider value={footnoteData}>
        <EditorCommentContext.Provider value={commentData}>
          <PostFrameProvider value={frame}>
            <PageWrapper
              onClickAction={(e) => {
                if (e.defaultPrevented) return;
                if (rep) {
                  if (isFocused) return;
                  focusPage(props.entityID, rep);
                }
              }}
              id={elementId.page(props.entityID).container}
              drawerOpen={!!drawer?.inline}
              isFocused={isFocused}
              fullPageScroll={props.fullPageScroll}
              pageType={pageType}
              overflow={canvasBelowHeader ? "scroll" : undefined}
              pageOptions={
                <PageOptions
                  entityID={props.entityID}
                  first={props.first}
                  isFocused={isFocused}
                />
              }
              footnoteSideColumn={
                <AnnotationSideColumn
                  pageEntityID={props.entityID}
                  visible={sideColumnVisible}
                  fullPageScroll={props.fullPageScroll}
                />
              }
            >
              {/*this is used in the publication page, for publication information and
          nav*/}
              {props.header}
              {props.first &&
                pageType === "doc" &&
                !publicationPage &&
                !zoomedBlock && <PublicationMetadata />}
              {props.first && pageType === "doc" && <InlineVersionBanner />}
              {canvasBelowHeader ? (
                // A borderless card overhangs the bottom of the window (see
                // PageWrapper's negative margins); the padding keeps the
                // canvas's end reachable and the overlays on screen.
                <CanvasPageArea
                  className={
                    cardBorderHidden
                      ? "pb-3 sm:pb-6 [--canvas-sticky-bottom:12px] sm:[--canvas-sticky-bottom:24px]"
                      : ""
                  }
                >
                  <Canvas
                    entityID={props.entityID}
                    first={props.first}
                    pageScroll
                  />
                </CanvasPageArea>
              ) : (
                <PageContent
                  entityID={props.entityID}
                  first={props.first}
                  zoomedBlock={zoomedBlock}
                />
              )}
            </PageWrapper>
          </PostFrameProvider>
          {drawer && (
            <InteractionDrawer
              threadsOnly
              showPageBackground={!cardBorderHidden}
              document_uri={rootEntity}
              pageId={drawer.pageId}
            />
          )}
          <DesktopPageFooter pageID={props.entityID} />
          <FootnotePopover pageID={props.entityID} />
          <EditorCommentPopover />
          <EditorCommentMobileSheet />
          <EditorCommentAnchorHover />
          <LinkPopover pageID={props.entityID} />
        </EditorCommentContext.Provider>
      </FootnoteContext.Provider>
    </CardThemeProvider>
  );
}

const PageContent = (props: {
  entityID: string;
  first?: boolean;
  zoomedBlock?: string;
}) => {
  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  if (pageType === "doc")
    return (
      <DocContent entityID={props.entityID} zoomedBlock={props.zoomedBlock} />
    );
  return <Canvas entityID={props.entityID} first={props.first} />;
};

const DocContent = (props: { entityID: string; zoomedBlock?: string }) => {
  let { rootEntity } = useReplicache();

  let cardBorderHidden = useCardBorderHidden(props.entityID);
  let rootBackgroundImage = useEntity(
    rootEntity,
    "theme/card-background-image",
  );
  let rootBackgroundRepeat = useEntity(
    rootEntity,
    "theme/card-background-image-repeat",
  );
  let rootBackgroundOpacity = useEntity(
    rootEntity,
    "theme/card-background-image-opacity",
  );

  let cardBackgroundImage = useEntity(
    props.entityID,
    "theme/card-background-image",
  );

  let cardBackgroundImageRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );

  let cardBackgroundImageOpacity = useEntity(
    props.entityID,
    "theme/card-background-image-opacity",
  );

  let backgroundImage = cardBackgroundImage || rootBackgroundImage;
  let backgroundImageRepeat = cardBackgroundImage
    ? cardBackgroundImageRepeat?.data?.value
    : rootBackgroundRepeat?.data.value;
  let backgroundImageOpacity = cardBackgroundImage
    ? cardBackgroundImageOpacity?.data.value
    : rootBackgroundOpacity?.data.value || 1;

  return (
    <>
      {!cardBorderHidden ? (
        <div
          className={`pageBackground
        absolute top-0 left-0 right-0 bottom-0
        pointer-events-none
        rounded-lg
        `}
          style={{
            backgroundImage: backgroundImage
              ? `url(${backgroundImage.data.src}), url(${backgroundImage.data.fallback})`
              : undefined,
            backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
            backgroundPosition: "center",
            backgroundSize: !backgroundImageRepeat
              ? "cover"
              : backgroundImageRepeat,
            opacity: backgroundImage?.data.src ? backgroundImageOpacity : 1,
          }}
        />
      ) : null}
      {props.zoomedBlock ? (
        <ZoomedBlockHeader
          pageEntity={props.entityID}
          entityID={props.zoomedBlock}
        />
      ) : null}
      <Blocks entityID={props.entityID} />
      <FootnoteSection />
      <div className="h-4 sm:h-6 w-full" />
      {/* we handle page bg in this sepate div so that
    we can apply an opacity the background image
    without affecting the opacity of the rest of the page */}
    </>
  );
};

const ZoomedBlockHeader = (props: { pageEntity: string; entityID: string }) => {
  let [reference] = useReferenceToEntity("card/block", props.entityID);
  let zoomOut = useUIState((state) => state.zoomOutOfBlock);
  let isFocused = useIsPageFocused(props.pageEntity);
  let parentEntity = reference?.entity;

  useEffect(() => {
    if (!isFocused) return;
    return addShortcut({
      metaKey: true,
      shift: true,
      key: ["H", "h"],
      skipIfDefaultPrevented: true,
      handler: () => {
        if (!parentEntity || parentEntity === props.pageEntity)
          zoomOut(props.pageEntity);
        else zoomIntoBlock(props.pageEntity, parentEntity);
      },
    });
  }, [isFocused, parentEntity, props.pageEntity, zoomOut]);

  return (
    <div className="px-3 sm:px-4 pt-2 sm:pt-3">
      <button
        className="flex items-center gap-1 text-sm text-tertiary hover:text-accent-contrast"
        onClick={(event) => {
          event.preventDefault();
          zoomOut(props.pageEntity);
        }}
      >
        <GoBackTiny /> back to full document
      </button>
    </div>
  );
};
