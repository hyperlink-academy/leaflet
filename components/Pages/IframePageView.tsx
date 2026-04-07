"use client";

import React, { useMemo } from "react";
import { useIframeChannel } from "src/hooks/useIframeChannel";
import { PageWrapper } from "./Page";

export function IframePageView(props: {
  url: string;
  pageOptions?: React.ReactNode;
  onOpen: (url: string) => void;
}) {
  let { iframeRef } = useIframeChannel({
    onOpen: props.onOpen,
    onReplaceWith: () => {},
    onAddBelow: () => {},
  });

  let iframeSrc = useMemo(() => {
    let src = new URL(props.url);
    src.searchParams.set("parts.page.mode", "edit");
    return src.toString();
  }, [props.url]);

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
        src={iframeSrc}
        allow="fullscreen"
        loading="lazy"
      />
    </PageWrapper>
  );
}
