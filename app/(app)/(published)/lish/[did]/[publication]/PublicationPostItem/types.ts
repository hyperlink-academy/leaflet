import React from "react";
import type { GatePolicy, WiderRelease } from "src/membership";

export type CommonProps = {
  href?: string;
  // Intercept the post link's click (e.g. the reader feed opening the post in
  // its viewer instead of navigating). The href stays for modified clicks.
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  title?: string;
  description?: string;
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
  pubInfo?: React.ReactNode;
  inList?: boolean;
  membersOnly?: boolean;
  publicationUri?: string;
  gatePolicy?: GatePolicy | null;
  // Set while the post is in early access, for the badge's release countdown.
  widerRelease?: WiderRelease | null;
};

export type LargeProps = CommonProps & {
  coverImageSrc?: string;
  coverImageAlt?: string;
  pageWidth?: number;
};

export type MediumProps = CommonProps & {
  coverImageSrc?: string;
  coverImageAlt?: string;
};
