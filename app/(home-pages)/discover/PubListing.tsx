"use client";
import { AtUri } from "@atproto/syntax";
import { PublicationSubscription } from "app/(home-pages)/reader/getSubscriptions";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { PubIcon } from "components/ActionBar/Publications";
import { Separator } from "components/Layout";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { timeAgo } from "src/utils/timeAgo";

export const PubListing = (
  props: PublicationSubscription & {
    resizeHeight?: boolean;
  },
) => {
  let record = props.record;
  let theme = usePubTheme(record?.theme);
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
        href={record.url}
        className={`no-underline! flex flex-row gap-2
          bg-bg-leaflet
          border border-border-light rounded-lg
          px-3 py-3 selected-outline
          hover:outline-accent-contrast hover:border-accent-contrast
          relative overflow-hidden`}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
      >
        <div
          className={`flex w-full flex-col justify-center text-center max-h-48 pt-4 pb-3 px-3 rounded-lg relative z-10 ${props.resizeHeight ? "" : "sm:h-48 h-full"} ${record.theme?.showPageBackground ? "bg-[rgba(var(--bg-page),var(--bg-page-alpha))] " : ""}`}
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
              {props.authorProfile?.handle}
            </div>
            <p>
              Updated{" "}
              {timeAgo(
                props.documents_in_publications?.[0]?.documents?.indexed_at ||
                  "",
              )}
            </p>
          </div>
        </div>
      </a>
    </BaseThemeProvider>
  );
};
