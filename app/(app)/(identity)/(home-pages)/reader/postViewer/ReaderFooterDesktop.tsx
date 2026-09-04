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
        absolute -bottom-px -left-0.5 -right-0.5 -top-1
        flex gap-4 items-center
        w-full px-1 pt-2`}
    >
      <ReaderFooterCloseButton {...props} />
      <ReaderFooterPostInfo
        {...props}
        className="transparent-container border-none! py-1 h-fit"
      />
      <Separator />
      <ReaderFooterNav {...props} />
    </div>
  );
};
