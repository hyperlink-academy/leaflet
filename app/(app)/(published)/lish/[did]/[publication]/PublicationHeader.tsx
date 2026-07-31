import { PubIcon } from "components/ActionBar/Publications";
import {
  SubscribeInput,
  type SubscribeProps,
} from "components/Subscribe/SubscribeButton";
import type { WordmarkData } from "src/utils/wordmark";
import React from "react";
import { Popover } from "components/Popover";
import { EditTiny } from "components/Icons/EditTiny";
import { WordmarkEditor } from "components/ThemeManager/WordmarkEditor";

// The data needed to render a subscribe control.
export type SubscribeData = SubscribeProps;

// Renders a publication wordmark image, sized to its configured max width.
export function Wordmark(props: {
  wordmark: WordmarkData;
  alt?: string;
  className?: string;
}) {
  return (
    <img
      src={props.wordmark.src}
      alt={props.alt || ""}
      className={`pubHeaderWordmark mx-auto h-auto object-contain ${props.className || ""}`}
      style={{
        width: props.wordmark.width ? `${props.wordmark.width}px` : "auto",
        maxWidth: "100%",
      }}
    />
  );
}

export function PublicationHeader(props: {
  iconUrl?: string;
  wordmark?: WordmarkData | null;
  publicationName: string;
  description?: string;
  author?: React.ReactNode;
  subscribe?: SubscribeData;
  variant?: "stacked" | "inline";
}) {
  let variant = props.variant ?? "stacked";
  let icon = props.iconUrl ? (
    <div
      className={`pubHeaderIcon shrink-0 rounded-full w-12 h-12 ${variant === "stacked" ? " mx-auto" : ""}`}
      style={{
        backgroundImage: `url(${props.iconUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    />
  ) : null;
  let title = (
    <h2
      className={`pubHeaderTitle text-accent-contrast${variant === "stacked" ? " pt-1" : ""}`}
    >
      {props.publicationName}
    </h2>
  );

  return (
    <div
      className="pubHeader flex flex-col w-full text-center justify-center"
      style={{
        paddingBottom: "calc(32px - 32px * var(--header-shrink, 0))",
        ...(variant === "stacked"
          ? { paddingTop: "calc(4px - 4px * var(--header-shrink, 0))" }
          : null),
      }}
    >
      {props.wordmark ? (
        <Wordmark wordmark={props.wordmark} alt={props.publicationName} />
      ) : variant === "inline" ? (
        <div className="flex items-center justify-center gap-3">
          {icon}
          {title}
        </div>
      ) : (
        <>
          {icon}
          {title}
        </>
      )}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: "calc((1 - var(--header-shrink, 0)) * 400px)",
          opacity: "calc(1 - var(--header-shrink, 0))",
        }}
      >
        {props.description && (
          <p className="sm:text-lg text-secondary">{props.description}</p>
        )}
        {props.author}
        {props.subscribe && (
          <div className="pt-4 pb-1 px-3">
            <div className="max-w-sm mx-auto sm:w-fit w-full">
              <SubscribeInput {...props.subscribe} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NewPublicationHeader(props: {
  iconUrl?: string;
  wordmark?: WordmarkData | null;
  hideSubscribeInHeader?: boolean;
  description?: string;
  author?: React.ReactNode;
  subscribe?: SubscribeData;
  hasNav?: boolean;
  edit?: boolean;
}) {
  return (
    <div className="group/wordmark publicationHeader flex flex-col gap-2 sm:px-4 px-3 sm:pt-10 sm:pb-3 pt-6 pb-0 ">
      <div className="mx-auto">
        <div className="publicationName relative flex sm:flex-row flex-col items-start justify-center sm:gap-3 gap-1">
          {props.wordmark ? (
            <Wordmark
              wordmark={props.wordmark}
              alt={props.subscribe?.publicationName}
            />
          ) : (
            <>
              {props.iconUrl && (
                <PubIcon
                  className="sm:w-8! sm:h-8! sm:mt-1 w-12! h-12! mx-auto"
                  icon={props.iconUrl}
                  pubName={props.subscribe?.publicationName}
                />
              )}
              <h2
                className={`sm:text-xl text-[1.5rem] text-accent-contrast sm:text-left text-center leading-snug`}
              >
                {props.subscribe?.publicationName}
              </h2>
            </>
          )}
          {props.edit && (
            <div className="absolute -top-2 -left-3">
              <Popover
                className="pb-3!"
                trigger={
                  <div
                    aria-label="Edit publication header"
                    className="  p-1 rounded-full bg-accent-1 text-accent-2 border border-accet-2"
                  >
                    <EditTiny />
                  </div>
                }
              >
                <WordmarkEditor />
              </Popover>
            </div>
          )}
        </div>
      </div>
      {props.subscribe && (
        <div
          className={`
            ${props.hideSubscribeInHeader && "sm:hidden pb-2"}
            ${props.edit && "pointer-events-none"}
            block max-w-full w-fit mx-auto px-3 sm:px-0`}
        >
          <SubscribeInput {...props.subscribe} />
        </div>
      )}
    </div>
  );
}
