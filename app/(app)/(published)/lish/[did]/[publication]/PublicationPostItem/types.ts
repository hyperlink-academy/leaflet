import React from "react";
import type { GatePolicy } from "src/membership";

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
