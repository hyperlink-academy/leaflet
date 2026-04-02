"use client";

import React from "react";
import { useIframeChannel } from "src/hooks/useIframeChannel";
import { PageWrapper } from "./Page";

export function IframePageView(props: {
  url: string;
  pageOptions?: React.ReactNode;
  onOpen: (url: string) => void;
}) {
  let { iframeRef } = useIframeChannel({ onOpen: props.onOpen });

  return (
    <PageWrapper
      id={`iframe-page-${props.url}`}
      isFocused={false}
      fullPageScroll={false}
      pageType="doc"
      drawerOpen={false}
      pageOptions={props.pageOptions}
      noBottomSpacer
      overflow="hidden"
    >
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        src={props.url}
        allow="fullscreen"
        loading="lazy"
      />
    </PageWrapper>
  );
}
