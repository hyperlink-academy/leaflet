"use client";
import { AtUri } from "@atproto/syntax";
import { PubIcon } from "components/ActionBar/Publications";
import { Separator } from "components/Layout";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { timeAgo } from "src/utils/timeAgo";
import { Json } from "supabase/database.types";

export const PubListing = (props: {
  resizeHeight?: boolean;
  record: Json;
  uri: string;
  documents_in_publications: {
    documents: { data: Json; indexed_at: string } | null;
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
        <div
          className={`flex w-full flex-col justify-center text-center max-h-48 pt-4 pb-3 px-3 rounded-lg ${props.resizeHeight ? "" : "sm:h-48 h-full"} ${record.theme?.showPageBackground ? "bg-[rgba(var(--bg-page),var(--bg-page-alpha))] " : ""}`}
        >
          <div className="mx-auto pb-1">
            <PubIcon record={record} uri={props.uri} large />
          </div>

          <h4 className="truncate shrink-0 ">{record.name}</h4>
          {record.description && (
            <p className="text-secondary text-sm max-h-full overflow-hidden pb-1">
              {record.description}
            </p>
          )}
          <div className="flex flex-col items-center justify-center text-xs text-tertiary pt-2">
            <div className="flex flex-row gap-2 items-center">
              <div className="h-[14px] w-[14px] rounded-full bg-test shrink-0" />
              <p>Name Here</p>{" "}
            </div>
            <p>
              Updated{" "}
              {timeAgo(
                props.documents_in_publications.sort((a, b) => {
                  let dateA = new Date(a.documents?.indexed_at || 0);
                  let dateB = new Date(b.documents?.indexed_at || 0);
                  return dateB.getTime() - dateA.getTime();
                })[0].documents?.indexed_at || "",
              )}
            </p>
          </div>
        </div>
      </a>
    </BaseThemeProvider>
  );
};
