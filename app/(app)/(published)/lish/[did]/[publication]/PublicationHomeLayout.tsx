"use client";

import React from "react";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";
import {
  PublicationHeader,
  NewPublicationHeader,
  type SubscribeData,
} from "./PublicationHeader";
import { PublicationNav, type PublicationNavPage } from "./PublicationNav";
import { SubscribeSuccessPrefetch } from "components/Subscribe/useSubscribeSuccessData";
import { SpeedyLink } from "components/SpeedyLink";
import type { WordmarkData } from "src/utils/wordmark";

export function PublicationHomeLayout(props: {
  showPageBackground: boolean;
  iconUrl?: string;
  wordmark?: WordmarkData | null;
  author?: React.ReactNode;
  navPages: PublicationNavPage[];
  publicationUrl: string;
  activePath: string;
  subscribe: SubscribeData;
  children: React.ReactNode;
  pageWidth?: number;
  // The page is a canvas: it fills the height below the nav and widens past
  // the page width, like the canvas in the publication editor.
  fillWithCanvas?: boolean;
}) {
  let { ref } = usePreserveScroll<HTMLDivElement>(
    props.subscribe.publicationUri,
  );
  let hasNav = props.navPages.length > 0;

  let narrowPage = props.pageWidth && props.pageWidth < 480;
  let hideSubscribeInHeader = props.navPages.length > 1 && !narrowPage;

  // When the publication has nav pages, mirror the editor (PublicationEditLayout
  // + PublicationPagesNav): an inline header that scrolls away above a sticky
  // tab-bar nav. Otherwise fall back to the full stacked header.
  let header = hasNav ? (
    <>
      <div className="shrink-0">
        <div className="sm:max-w-(--page-width-units) mx-auto ">
          <NewPublicationHeader
            iconUrl={props.iconUrl}
            wordmark={props.wordmark}
            description={props.subscribe.publicationDescription}
            hasNav={props.navPages.length > 1}
            subscribe={props.subscribe}
            hideSubscribeInHeader={hideSubscribeInHeader}
          />
        </div>
      </div>
      <PublicationNav
        publicationUrl={props.publicationUrl}
        pages={props.navPages}
        activePath={props.activePath}
        showPageBackground={props.showPageBackground}
        subscribe={props.subscribe}
        hideSubscribeInHeader={hideSubscribeInHeader}
      />
    </>
  ) : (
    <div className="pubFullHeader shrink-0">
      <div className="sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4 pt-5">
        <PublicationHeader
          variant="stacked"
          iconUrl={props.iconUrl}
          publicationName={props.subscribe.publicationName}
          description={props.subscribe.publicationDescription}
          author={props.author}
          subscribe={props.subscribe}
        />
      </div>
    </div>
  );

  let inner = (
    <>
      <SubscribeSuccessPrefetch
        publicationUri={props.subscribe.publicationUri}
      />
      {header}
      {props.fillWithCanvas ? (
        <main
          className={`pubContent relative grow min-h-[360px] w-full flex justify-center ${props.showPageBackground ? "" : "pt-3"}`}
        >
          {props.children}
        </main>
      ) : (
        <main className="pubContent sm:max-w-(--page-width-units) w-full mx-auto pb-5 px-1">
          {props.children}
        </main>
      )}
      {/* Always-rendered plain link so crawlers can reach every post through
          the archive, which infinite scroll otherwise hides past the first
          batch. Built off publicationUrl like the nav tabs, so it resolves on
          custom domains too. */}
      <div className="pubFooter text-center pb-4 hidden">
        <SpeedyLink
          href={`${props.publicationUrl.replace(/\/+$/, "")}/archive`}
          className="text-sm text-tertiary hover:text-accent-contrast"
        >
          Archive
        </SpeedyLink>
      </div>
    </>
  );
  if (props.showPageBackground) {
    return (
      <div
        className={`pubWrapper flex flex-col sm:py-6 h-full mx-auto px-0 py-2 ${props.fillWithCanvas ? "max-w-(--page-width-units) sm:max-w-[min(1274px,calc(100vw-128px))]" : "max-w-(--page-width-units)"}`}
      >
        <div
          ref={ref}
          className="pubContentScroll publicationScrollContainer overflow-auto h-full bg-[rgba(var(--bg-page),var(--bg-page-alpha))] border border-border rounded-lg flex flex-col max-w-full w-[10000px]"
        >
          {inner}
        </div>
      </div>
    );
  }
  return (
    <div
      ref={ref}
      className="pubWrapper publicationScrollContainer flex flex-col sm:pb-6 h-full w-full overflow-y-scroll"
    >
      {inner}
    </div>
  );
}
