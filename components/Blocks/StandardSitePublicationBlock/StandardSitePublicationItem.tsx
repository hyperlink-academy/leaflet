"use client";
import { AtUri } from "@atproto/api";
import Link from "next/link";
import { PubIcon } from "components/ActionBar/Publications";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { formatBylineNames } from "src/utils/byline";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";
import type { StandardSitePublicationData } from "app/api/rpc/[command]/get_standard_site_publications";

export function StandardSitePublicationItem({ uri }: { uri: string }) {
  const { data, isLoading } = useStandardSitePublication(uri);

  if (isLoading) return <StandardSitePublicationItemPlaceholder />;
  if (!data)
    return (
      <p className="text-sm italic text-tertiary p-4">Publication not found.</p>
    );

  return <StandardSitePublicationItemView publication={data} />;
}

function StandardSitePublicationItemPlaceholder() {
  return (
    <div className="transparent-container flex w-full gap-3 items-start p-3">
      <div className="shrink-0 w-12 h-12 rounded-full bg-border-light animate-pulse" />
      <div className="flex flex-col gap-2 grow min-w-0 pt-1">
        <div className="h-6 w-1/2 bg-border-light rounded animate-pulse" />
        <div className="h-4 w-full bg-border-light rounded animate-pulse" />
        <div className="h-4 w-32 bg-border-light rounded animate-pulse" />
      </div>
    </div>
  );
}

export function StandardSitePublicationItemView({
  publication,
}: {
  publication: StandardSitePublicationData;
}) {
  const { record, author } = publication;
  const pubUrl = getPublicationURL(publication);

  let host: string | undefined;
  try {
    host = new AtUri(publication.uri).host;
  } catch {
    host = undefined;
  }
  const iconSrc =
    record.icon && host ? blobRefToSrc(record.icon.ref, host) : undefined;

  const authorLabel = author
    ? formatBylineNames(
        [author.displayName || author.handle].filter((l): l is string => !!l),
      ) || undefined
    : undefined;

  return (
    <Link
      href={pubUrl}
      className="standardSitePublicationItem flex w-full gap-3 items-start p-3 text-primary no-underline! hover:no-underline"
    >
      <PubIcon
        large
        icon={iconSrc}
        pubName={record.name}
        className="shrink-0 mt-0.5"
      />
      <div className="flex flex-col gap-1 grow min-w-0">
        <h3 className="text-accent-contrast leading-tight">{record.name}</h3>
        {record.description && (
          <p className="text-secondary text-sm line-clamp-3">
            {record.description}
          </p>
        )}
        {authorLabel && <p className="text-tertiary text-sm">{authorLabel}</p>}
      </div>
    </Link>
  );
}
