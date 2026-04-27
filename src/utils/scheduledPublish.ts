import type { AppBskyRichtextFacet } from "@atproto/api";

export const SCHEDULED_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: true,
};

export const SCHEDULED_DATE_FORMAT_NO_YEAR: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: true,
};

export function getFutureScheduledAt(
  scheduledPublishAt: string | null | undefined,
): string | null {
  if (!scheduledPublishAt) return null;
  return new Date(scheduledPublishAt).getTime() > Date.now()
    ? scheduledPublishAt
    : null;
}

type LeafletDataShape = {
  leaflets_in_publications?: { scheduled_publish_at: string | null }[] | null;
  leaflets_to_documents?: { scheduled_publish_at: string | null }[] | null;
};

export function getScheduledPublishAt(
  data: LeafletDataShape | null | undefined,
): string | null {
  return (
    data?.leaflets_in_publications?.[0]?.scheduled_publish_at ??
    data?.leaflets_to_documents?.[0]?.scheduled_publish_at ??
    null
  );
}

export type ScheduledPublishData = {
  shareState: {
    bluesky: boolean;
    postToReaders: boolean;
    email: boolean;
    quiet: boolean;
  };
  bskyText?: string;
  bskyFacets?: AppBskyRichtextFacet.Main[];
  did: string;
  publicationUrl?: string;
};
