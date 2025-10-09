"use client";
import { AtUri } from "@atproto/syntax";
import { PubIcon } from "components/ActionBar/Publications";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { timeAgo } from "src/utils/timeAgo";
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
        href={`https://${record.base_path}`}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
        className={`no-underline! flex flex-row gap-2
          bg-bg-leaflet
          border border-border-light rounded-lg
          px-3 py-3 selected-outline
          hover:outline-accent-contrast hover:border-accent-contrast`}
      >
        <PubIcon record={record} uri={props.uri} />

        <div
          className={`flex w-full flex-col ${record.theme?.showPageBackground ? "bg-[rgba(var(--bg-page),var(--bg-page-alpha))] px-2 py-1 rounded-lg" : ""}`}
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
