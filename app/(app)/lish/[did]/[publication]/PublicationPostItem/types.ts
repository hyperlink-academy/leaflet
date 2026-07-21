import React from "react";

export type CommonProps = {
  href?: string;
  title?: string;
  description?: string;
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
  pubInfo?: React.ReactNode;
  inList?: boolean;
  membersOnly?: boolean;
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
