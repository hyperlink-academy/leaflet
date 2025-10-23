"use client";

import React from "react";
import { useUIState } from "src/useUIState";

import { elementId } from "src/utils/elementId";

import { useEntity, useReferenceToEntity, useReplicache } from "src/replicache";

import { DesktopPageFooter } from "../DesktopFooter";
import { Canvas } from "../Canvas";
import { Blocks } from "components/Blocks";
import { PublicationMetadata } from "./PublicationMetadata";
import { useCardBorderHidden } from "./useCardBorderHidden";
import { focusPage } from ".";
import { PageOptions } from "./PageOptions";
import { CardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { useDrawerOpen } from "app/lish/[did]/[publication]/[rkey]/Interactions/InteractionDrawer";

export function Page(props: {
  entityID: string;
  first?: boolean;
  fullPageScroll: boolean;
}) {
  let { rep } = useReplicache();

  let isFocused = useUIState((s) => {
    let focusedElement = s.focusedEntity;
    let focusedPageID =
      focusedElement?.entityType === "page"
        ? focusedElement.entityID
        : focusedElement?.parent;
    return focusedPageID === props.entityID;
  });
  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let cardBorderHidden = useCardBorderHidden(props.entityID);
  let drawerOpen = useDrawerOpen(props.entityID);
  return (
    <CardThemeProvider entityID={props.entityID}>
      <PageWrapper
        onClickAction={(e) => {
          if (e.defaultPrevented) return;
          if (rep) {
            if (isFocused) return;
            focusPage(props.entityID, rep);
          }
        }}
        id={elementId.page(props.entityID).container}
        drawerOpen={!!drawerOpen}
        cardBorderHidden={!!cardBorderHidden}
        isFocused={isFocused}
        fullPageScroll={props.fullPageScroll}
        pageType={pageType}
        pageOptions={
          <PageOptions
            entityID={props.entityID}
            first={props.first}
            isFocused={isFocused}
          />
        }
      >
        {props.first && (
          <>
            <PublicationMetadata />
          </>
        )}
        <PageContent entityID={props.entityID} first={props.first} />
      </PageWrapper>
      <DesktopPageFooter pageID={props.entityID} />
    </CardThemeProvider>
  );
}

export const PageWrapper = (props: {
  id: string;
  children: React.ReactNode;
  pageOptions?: React.ReactNode;
  cardBorderHidden: boolean;
  fullPageScroll: boolean;
  isFocused?: boolean;
  onClickAction?: (e: React.MouseEvent) => void;
  pageType: "canvas" | "doc";
  drawerOpen: boolean | undefined;
}) => {
  return (
    // this div wraps the contents AND the page options.
    // it needs to be its own div because this container does NOT scroll, and therefore doesn't clip the absolutely positioned pageOptions
    <div
      className={`pageWrapper relative shrink-0 ${props.fullPageScroll ? "w-full" : "w-max"}`}
    >
      {/*
        this div is the scrolling container that wraps only the contents div.

        it needs to be a separate div so that the user can scroll from anywhere on the page if there isn't a card border
        */}
      <div
        onClick={props.onClickAction}
        id={props.id}
        className={`
      pageScrollWrapper
      grow

      shrink-0 snap-center
      overflow-y-scroll
      ${
        !props.cardBorderHidden &&
        `h-full border
          bg-[rgba(var(--bg-page),var(--bg-page-alpha))]
          ${props.drawerOpen ? "rounded-l-lg " : "rounded-lg"}
          ${props.isFocused ? "shadow-md border-border" : "border-border-light"}`
      }
      ${props.cardBorderHidden && "sm:h-[calc(100%+48px)] h-[calc(100%+20px)] sm:-my-6 -my-3 sm:pt-6 pt-3"}
      ${props.fullPageScroll && "max-w-full "}
    ${props.pageType === "doc" && !props.fullPageScroll && "w-[10000px] sm:mx-0 max-w-[var(--page-width-units)]"}
    ${
      props.pageType === "canvas" &&
      !props.fullPageScroll &&
      "max-w-[100vw] sm:max-w-[calc(100vw-128px)] lg:max-w-fit lg:w-[calc(var(--page-width-units)*2 + 24px))]"
    }

`}
      >
        <div
          className={`postPageContent
          ${props.fullPageScroll ? "sm:max-w-[var(--page-width-units)] mx-auto" : "w-full h-full"}
        `}
        >
          {props.children}
          <div className="h-4 sm:h-6 w-full" />
        </div>
      </div>
      {props.pageOptions}
    </div>
  );
};

const PageContent = (props: { entityID: string; first?: boolean }) => {
  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  if (pageType === "doc") return <DocContent entityID={props.entityID} />;
  return <Canvas entityID={props.entityID} first={props.first} />;
};

const DocContent = (props: { entityID: string }) => {
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
      <Blocks entityID={props.entityID} />
      {/* we handle page bg in this sepate div so that
    we can apply an opacity the background image
    without affecting the opacity of the rest of the page */}
    </>
  );
};
