"use client";
import type { ReaderFooterVariantProps } from "./ReaderFooter";
import {
  ReaderFooterCloseButton,
  ReaderFooterNav,
  ReaderFooterPostInfo,
} from "./ReaderFooterParts";

// A bar of its own: it sits over the top edge of the frame with a border and a
// page background, so it reads as chrome the post scrolls under.
export const ReaderFooterMobile = (props: ReaderFooterVariantProps) => {
  return (
    <div
      className={`
        mobileReaderFooter pointer-events-auto
        absolute -bottom-px -top-1 -left-px -right-px
        flex flex-col gap-2
        w-[calc(100vw+2px)] px-1 pt-1 pwa-bottom-padding
        rounded-t-lg
        border border-border-light
        bg-bg-page`}
    >
      <ReaderFooterPostInfo {...props} className="light-container px-1 py-0" />
      <div className="readerOptions flex gap-6 justify-between px-1 pb-2">
        <ReaderFooterCloseButton {...props} />
        <ReaderFooterNav {...props} />
      </div>
    </div>
  );
};
