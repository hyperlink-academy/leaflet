"use client";
import { Fragment } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { EditTiny } from "components/Icons/EditTiny";
import { ClockTiny } from "components/Icons/ClockTiny";

// A draft that goes out on its own (an email-only post, a scheduled publish)
// as the dashboard lists it.
export function TimedPostItem(props: {
  leaflet: string;
  title: string;
  description: string;
  badge: React.ReactNode;
  // When it goes out, and a link to the draft's send or publish options.
  footer?: {
    when: React.ReactNode;
    options: { label: string; href: string } | null;
  };
  showPageBackground: boolean;
}) {
  let { showPageBackground } = props;
  return (
    <Fragment>
      <div
        className={`grow flex flex-col rounded-lg border ${showPageBackground ? "border-border-light py-1 px-2" : "border-transparent px-1"}`}
        style={{
          backgroundColor: showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : "transparent",
        }}
      >
        <div className="flex justify-between gap-2">
          <SpeedyLink
            className="hover:no-underline!"
            href={`/${props.leaflet}`}
          >
            <h3 className="text-primary grow leading-snug">
              {props.title || "Untitled"}
            </h3>
          </SpeedyLink>
          <div className="flex items-center gap-2">
            {props.badge}
            <SpeedyLink href={`/${props.leaflet}`}>
              <EditTiny />
            </SpeedyLink>
          </div>
        </div>
        {props.description ? (
          <p className="italic text-secondary">{props.description}</p>
        ) : null}
        {props.footer && (
          <div className="text-sm text-tertiary flex gap-3 justify-between items-center pt-3">
            {props.footer.when}
            {props.footer.options && (
              <SpeedyLink
                className="font-bold text-accent-contrast"
                href={props.footer.options.href}
              >
                {props.footer.options.label}
              </SpeedyLink>
            )}
          </div>
        )}
      </div>
      {!showPageBackground && (
        <hr className="last:hidden border-border-light" />
      )}
    </Fragment>
  );
}

export const statusPill = (
  className: string,
  label: string,
  clock?: boolean,
) => (
  <div
    className={`flex items-center gap-1 font-bold text-xs px-1.5 ${className}`}
  >
    {clock && <ClockTiny className="shrink-0 scale-75" />}
    {label}
  </div>
);
