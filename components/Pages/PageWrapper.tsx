"use client";

import type { JSX } from "react";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";
import { useCardBorderHidden } from "./useCardBorderHidden";

export const PageWrapper = (props: {
  id: string;
  children: React.ReactNode;
  pageOptions?: React.ReactNode;
  footnoteSideColumn?: React.ReactNode;
  fullPageScroll: boolean;
  isFocused?: boolean;
  onClickAction?: (e: React.MouseEvent) => void;
  pageType: "canvas" | "doc";
  drawerOpen: boolean | undefined;
  fixedWidth?: boolean;
  noBottomSpacer?: boolean;
  overflow?: "scroll" | "hidden";
}) => {
  const cardBorderHidden = useCardBorderHidden();
  let { ref } = usePreserveScroll<HTMLDivElement>(props.id);
  let canvasPageScroll =
    props.pageType === "canvas" && props.overflow === "scroll";
  // Scrolled by the page and as wide as one.
  let pageLayout = props.pageType === "doc" || canvasPageScroll;
  return (
    // this div wraps the contents AND the page options.
    // it needs to be its own div because this container does NOT scroll, and therefore doesn't clip the absolutely positioned pageOptions
    <div
      className={`pageWrapper relative shrink-0 h-full ${props.fullPageScroll ? "w-full" : "w-max"}`}
    >
      {/*
        this div is the scrolling container that wraps only the contents div.

        it needs to be a separate div so that the user can scroll from anywhere on the page if there isn't a card border
        */}
      <div
        ref={ref}
        onClick={props.onClickAction}
        id={props.id}
        // footnote-scope (the counter-reset the inline footnote numbers count
        // from) has to sit here rather than on the contents div below: that div
        // is display:contents in the card-border layout, and counter properties
        // on a box-less element are ignored, so every block started its own
        // counter and inline refs all rendered as 1.
        className={`
      pageScrollWrapper
      footnote-scope
      publicationScrollContainer
      grow relative
      shrink-0 snap-center
      ${props.overflow === "hidden" || !pageLayout ? "overflow-hidden" : "overflow-y-scroll"}
      ${
        !cardBorderHidden &&
        `border
          bg-[rgba(var(--bg-page),var(--bg-page-alpha))]
          h-full
          ${props.drawerOpen ? "rounded-l-lg " : "rounded-lg"}
          ${props.isFocused ? "shadow-md border-border" : "border-border-light"}`
      }
      ${cardBorderHidden && "sm:h-[calc(100%+48px)] h-[calc(100%+20px)] sm:-my-6 -my-3 sm:pt-6 pt-3"}
      ${props.fullPageScroll && "max-w-full "}
      ${
        // The canvas is as wide as the inside of the card, and a classic
        // scrollbar would take its width out of that.
        canvasPageScroll && !cardBorderHidden ? "no-scrollbar" : ""
      }
    ${pageLayout && !props.fullPageScroll ? (props.fixedWidth ? "w-[10000px] sm:max-w-prose max-w-[var(--page-width-units)]" : "w-[10000px] sm:mx-0 max-w-[var(--page-width-units)]") : ""}
    ${
      !pageLayout &&
      !props.fullPageScroll &&
      "max-w-[var(--page-width-units)] sm:max-w-[calc(var(--leaflet-layout-width,100vw)-128px)] lg:max-w-[calc(var(--leaflet-layout-width,100vw)-128px)]"
    }

`}
      >
        <div
          className={`postPageContent static
          ${props.fullPageScroll ? `${pageLayout ? "min-h-full" : "h-full"} sm:max-w-[var(--page-width-units)] mx-auto` : " contents w-full h-full"}
        `}
        >
          {props.children}
          {props.pageType === "doc" && !props.noBottomSpacer && (
            <div className="h-4 sm:h-6 w-full" />
          )}
        </div>
      </div>
      {props.pageOptions}
      {props.footnoteSideColumn}
    </div>
  );
};

export const PageOptionButton = ({
  children,
  secondary,
  className,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  secondary?: boolean;
  className?: string;
  disabled?: boolean;
} & Omit<JSX.IntrinsicElements["button"], "content">) => {
  const cardBorderHidden = useCardBorderHidden();
  return (
    <button
      className={`
        pageOptionsTrigger
        shrink-0
        pt-[2px] h-5 w-5 p-0.5 mx-auto
        border border-border
        ${secondary ? "bg-border text-bg-page" : "bg-bg-page text-border"}
        ${disabled && "opacity-50"}
        ${cardBorderHidden ? "rounded-md" : `rounded-b-md sm:rounded-l-none sm:rounded-r-md`}
        flex items-center justify-center
        ${className}

        `}
      {...props}
    >
      {children}
    </button>
  );
};
