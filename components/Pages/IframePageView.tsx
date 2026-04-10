"use client";

import React, { useMemo } from "react";
import { useIframeChannel } from "src/hooks/useIframeChannel";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
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

  let bgPage = useColorAttribute(null, "theme/page-background");
  let primary = useColorAttribute(null, "theme/primary");
  let iframeSrc = useMemo(() => {
    let src = new URL(props.url);
    src.searchParams.set("parts.page.embed.ctx.mode", "edit");
    src.searchParams.set(
      "parts.page.embed.ctx.bgColor",
      bgPage.toString("hex"),
    );
    src.searchParams.set(
      "parts.page.embed.ctx.primaryColor",
      primary.toString("hex"),
    );
    return src.toString();
  }, [props.url, bgPage, primary]);

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
