"use client";

import React from "react";
import { usePreserveScroll } from "src/hooks/usePreserveScroll";
import { PublicationHeader } from "./PublicationHeader";
import { PublicationNav, type PublicationNavPage } from "./PublicationNav";
import { PublicationStickyHeader } from "./PublicationStickyHeader";

export function PublicationHomeLayout(props: {
  uri: string;
  showPageBackground: boolean;
  iconUrl?: string;
  publicationName: string;
  description?: string;
  author?: React.ReactNode;
  subscribeButton?: React.ReactNode;
  navPages: PublicationNavPage[];
  publicationUrl: string;
  activePath: string;
  children: React.ReactNode;
}) {
  let { ref } = usePreserveScroll<HTMLDivElement>(props.uri);
  let hasNav = props.navPages.length > 0;

  let header = hasNav ? (
    <PublicationStickyHeader
      nav={
        <PublicationNav
          publicationUrl={props.publicationUrl}
          pages={props.navPages}
          activePath={props.activePath}
        />
      }
    >
      <PublicationHeader
        variant="inline"
        iconUrl={props.iconUrl}
        publicationName={props.publicationName}
      />
    </PublicationStickyHeader>
  ) : (
    <div className="pubFullHeader shrink-0">
      <div className="sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4 pt-5">
        <PublicationHeader
          iconUrl={props.iconUrl}
          publicationName={props.publicationName}
          description={props.description}
          author={props.author}
          subscribeButton={props.subscribeButton}
        />
      </div>
    </div>
  );

  let inner = (
    <>
      {header}
      <div className="pubContent sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4 pb-5">
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
