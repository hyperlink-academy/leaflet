import { PubIcon } from "components/ActionBar/Publications";
import {
  SubscribeInput,
  type SubscribeProps,
} from "components/Subscribe/SubscribeButton";
import React from "react";

// The data needed to render a subscribe control; the header owns the UI flags
// (autoFocus/compact), so callers only supply the publication data.
export type SubscribeData = Omit<SubscribeProps, "autoFocus" | "compact">;

export function PublicationHeader(props: {
  iconUrl?: string;
  publicationName: string;
  description?: string;
  author?: React.ReactNode;
  subscribe?: SubscribeData;
  variant?: "stacked" | "inline";
}) {
  let variant = props.variant ?? "stacked";
  let icon = props.iconUrl ? (
    <div
      className={`pubHeaderIcon shrink-0 rounded-full${variant === "stacked" ? " mx-auto" : ""}`}
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
      {variant === "inline" ? (
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
            <div className="max-w-sm mx-auto w-fit">
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
  publicationName: string;
  description?: string;
  author?: React.ReactNode;
  subscribe?: SubscribeData;
  hasNav?: boolean;
  edit?: boolean;
}) {
  let title = (
    <h2 className={`sm:text-xl text-[1.5rem]`}>{props.publicationName}</h2>
  );

  return (
    <div className="publicationHeader flex flex-col gap-2">
      <div className="publicationName flex sm:flex-row flex-col items-center justify-center sm:gap-3 gap-1">
        <PubIcon
          icon={props.iconUrl}
          pubName={props.subscribe?.publicationName}
        />
        {title}
      </div>
      {props.subscribe && (
        <div
          className={`${props.hasNav || props.edit ? "sm:hidden" : ""} ${props.edit && "pointer-events-none"} block max-w-full w-fit mx-auto`}
        >
          <SubscribeInput {...props.subscribe} />
        </div>
      )}
    </div>
  );
}
