import React from "react";
import type { GatePolicy } from "src/membership";

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
  publicationUri?: string;
  gatePolicy?: GatePolicy | null;
};

export type LargeProps = CommonProps & {
  coverImageSrc?: string;
  coverImageSrcSet?: string;
  coverImageAlt?: string;
  pageWidth?: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high";
};

export type MediumProps = CommonProps & {
  coverImageSrc?: string;
  coverImageSrcSet?: string;
  coverImageAlt?: string;
  loading?: "eager" | "lazy";
};
