"use client";
import { Separator } from "components/Layout";
import type { ReaderFooterVariantProps } from "./ReaderFooter";
import {
  ReaderFooterCloseButton,
  ReaderFooterNav,
  ReaderFooterPostInfo,
} from "./ReaderFooterParts";

export const ReaderFooterDesktop = (props: ReaderFooterVariantProps) => {
  return (
    <div
      className={`
        desktopReaderFooter pointer-events-auto
        absolute top-0 inset-x-0
      flex gap-4 items-center container border-none! rounded-lg!
        w-full px-2 py-1`}
    >
      <ReaderFooterCloseButton {...props} />
      <ReaderFooterPostInfo
        {...props}
        className="transparent-container border-none! py-1 h-fit"
      />
      <Separator classname="h-6!" />
      <ReaderFooterNav {...props} />
    </div>
  );
};
