"use client";
import { AtUri } from "@atproto/syntax";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { Json } from "supabase/database.types";

export const PubListing = (props: {
  record: Json;
  uri: string;
  documents_in_publications: {
    indexed_at: string;
    documents: { data: Json } | null;
  }[];
}) => {
  let record = props.record as PubLeafletPublication.Record;
  let theme = usePubTheme(record);
  let backgroundImage = record?.theme?.backgroundImage?.image?.ref
    ? blobRefToSrc(
        record?.theme?.backgroundImage?.image?.ref,
        new AtUri(props.uri).host,
      )
    : null;

  let backgroundImageRepeat = record?.theme?.backgroundImage?.repeat;
  let backgroundImageSize = record?.theme?.backgroundImage?.width || 500;
  if (!record) return null;
  return (
    <BaseThemeProvider {...theme} local>
      <a
        target="_blank"
        href={`https://${record.base_path}`}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
        className={`!no-underline flex flex-row gap-2
          bg-bg-leaflet
          border border-border-light rounded-lg
          px-3 py-3 selected-outline
          hover:outline-accent-contrast hover:border-accent-contrast`}
      >
        <div
          style={{
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundImage: record?.icon
              ? `url(${blobRefToSrc(record.icon?.ref, new AtUri(props.uri).host)})`
              : undefined,
          }}
          className={`w-6 h-6 mt-0.5 rounded-full bg-test shrink-0 ${record.theme?.showPageBackground ? "mt-[10px]" : "mt-0.5"}`}
        />
        <div
          className={`flex w-full flex-col ${record.theme?.showPageBackground ? "bg-[rgba(var(--bg-page),var(--bg-page-alpha))] p-2 rounded-lg" : ""}`}
        >
          <h3>{record.name}</h3>
          <p className="text-secondary">{record.description}</p>
          <div className="flex gap-1 items-center text-sm text-tertiary pt-2 ">
            <p>
              Updated {timeAgo(props.documents_in_publications[0].indexed_at)}
            </p>
          </div>
        </div>
      </a>
    </BaseThemeProvider>
  );
};

function timeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else {
    return "just now";
  }
}
