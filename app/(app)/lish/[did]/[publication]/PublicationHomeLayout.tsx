"use client";

import React from "react";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";
import {
  PublicationHeader,
  NewPublicationHeader,
  type SubscribeData,
} from "./PublicationHeader";
import { PublicationNav, type PublicationNavPage } from "./PublicationNav";

export function PublicationHomeLayout(props: {
  showPageBackground: boolean;
  iconUrl?: string;
  author?: React.ReactNode;
  navPages: PublicationNavPage[];
  publicationUrl: string;
  activePath: string;
  subscribe: SubscribeData;
  children: React.ReactNode;
}) {
  let { ref } = usePreserveScroll<HTMLDivElement>(
    props.subscribe.publicationUri,
  );
  let hasNav = props.navPages.length > 0;

  // When the publication has nav pages, mirror the editor (PublicationEditLayout
  // + PublicationPagesNav): an inline header that scrolls away above a sticky
  // tab-bar nav. Otherwise fall back to the full stacked header.
  let header = hasNav ? (
    <>
      <div className="shrink-0">
        <div className="sm:max-w-(--page-width-units) mx-auto ">
          <NewPublicationHeader
            iconUrl={props.iconUrl}
            description={props.subscribe.publicationDescription}
            hasNav={props.navPages.length > 1}
            subscribe={props.subscribe}
          />
        </div>
      </div>
      <PublicationNav
        publicationUrl={props.publicationUrl}
        pages={props.navPages}
        activePath={props.activePath}
        showPageBackground={props.showPageBackground}
        subscribe={props.subscribe}
      />
    </>
  ) : (
    <div className="pubFullHeader shrink-0">
      <div className="sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4 pt-5">
        <PublicationHeader
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
      {header}
      <div className="pubContent sm:max-w-(--page-width-units) w-full mx-auto pb-5 px-1">
        {props.children}
      </div>
    </>
  );
  if (props.showPageBackground) {
    return (
      <div className="pubWrapper flex flex-col sm:py-6 h-full max-w-(--page-width-units) mx-auto px-0 py-2">
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
