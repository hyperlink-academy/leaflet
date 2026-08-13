"use client";
import { AtUri } from "@atproto/syntax";
import { PublicationSubscription } from "actions/reader/getSubscriptions";
import { PubIcon } from "components/ActionBar/Publications";
import { SubscribeButton } from "components/Subscribe/SubscribeButton";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { timeAgo } from "src/utils/timeAgo";
import type { SubscriptionSource } from "src/subscriptionSource";

type PubListingProps = Omit<
  PublicationSubscription,
  | "publication_subscriptions"
  | "publication_newsletter_settings"
  | "documents_in_publications"
> & {
  publication_subscriptions?: PublicationSubscription["publication_subscriptions"];
  publication_newsletter_settings?: PublicationSubscription["publication_newsletter_settings"];
  documents_in_publications?: PublicationSubscription["documents_in_publications"];
  showSubscribeButton?: boolean;
  // Analytics source for the subscribe button, set per surface by the caller.
  subscribeSource?: SubscriptionSource;
  constrainHeight?: boolean;
  // Icon and title on one row, description clamped to two lines, no
  // updated-at — for tight spots like the subscribe-success modal.
  compact?: boolean;
};

export const PubListing = (props: PubListingProps) => {
  let record = props.record;
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
  let iconSrc = record.icon
    ? blobRefToSrc(record.icon.ref, new AtUri(props.uri).host)
    : undefined;

  return (
    <BaseThemeProvider {...theme} local>
      <div
        className={`no-underline! flex flex-row gap-2
          ${props.compact ? "grow" : ""}
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
        <a href={record.url} className="absolute inset-0 z-[1]" />
        <div
          className={`flex w-full flex-col justify-center text-center ${props.compact ? "py-3" : "pt-4 pb-3"} px-3 rounded-lg relative   ${props.constrainHeight ? "sm:h-[200px] h-full" : props.compact ? "h-full" : "h-fit"} ${record.theme?.showPageBackground ? "bg-[rgba(var(--bg-page),var(--bg-page-alpha))] " : ""}`}
        >
          {props.compact ? (
            <div className="flex flex-row gap-2 items-center justify-center pb-1 min-w-0">
              <PubIcon icon={iconSrc} pubName={record.name} />
              <h4 className="truncate min-w-0">{record.name}</h4>
            </div>
          ) : (
            <>
              <div className="mx-auto pb-1">
                <PubIcon icon={iconSrc} pubName={record.name} large />
              </div>

              <h4
                className={`${props.constrainHeight ? "truncate" : ""} shrink-0 `}
              >
                {record.name}
              </h4>
            </>
          )}
          {record.description && (
            <p
              className={`text-secondary ${props.compact ? "line-clamp-2" : props.constrainHeight ? "line-clamp-1" : ""} min-h-[16px] text-sm overflow-hidden `}
            >
              {record.description}
            </p>
          )}
          <div className="flex flex-col items-center justify-center text-xs text-tertiary pt-1">
            <div className="flex flex-row gap-2 items-center">
              {props.authorProfile?.handle}
            </div>
            {!props.compact &&
              props.documents_in_publications?.[0]?.documents?.sort_date && (
                <p>
                  Updated{" "}
                  {timeAgo(
                    props.documents_in_publications[0].documents.sort_date,
                  )}
                </p>
              )}
          </div>
          {props.showSubscribeButton && (
            <div
              className={`${props.compact ? "mt-2" : "mt-3"} max-w-sm mx-auto relative z-[2] w-fit`}
            >
              <SubscribeButton
                publicationUri={props.uri}
                publicationUrl={record.url}
                publicationName={record.name}
                publicationDescription={record.description}
                newsletterMode={
                  props.publication_newsletter_settings?.enabled ?? false
                }
                source={props.subscribeSource}
              />
            </div>
          )}
        </div>
      </div>
    </BaseThemeProvider>
  );
};
