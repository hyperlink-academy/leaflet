"use client";
import { PermissionToken } from "src/replicache";
import { useTemplateState } from "../Actions/CreateNewButton";
import { LeafletListPreview, LeafletGridPreview } from "./LeafletPreview";
import { LeafletInfo } from "./LeafletInfo";
import { useState, useRef, useEffect } from "react";
import { SpeedyLink } from "components/SpeedyLink";

export const LeafletListItem = (props: {
  token: PermissionToken;
  archived?: boolean | null;
  leaflet_id: string;
  loggedIn: boolean;
  display: "list" | "grid";
  cardBorderHidden: boolean;
  added_at: string;
  title: string;
  draftInPublication?: string;
  published?: boolean;
  publishedAt?: string;
  document_uri?: string;
  index: number;
  isHidden: boolean;
  showPreview?: boolean;
}) => {
  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === props.token.id),
  );

  let [isOnScreen, setIsOnScreen] = useState(props.index < 16 ? true : false);
  let previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewRef.current) return;
    let observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsOnScreen(true);
          } else {
            setIsOnScreen(false);
          }
        });
      },
      { threshold: 0.1, root: null },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [previewRef]);

  if (props.display === "list")
    return (
      <>
        <div
          ref={previewRef}
          className={`relative flex gap-3 w-full
            ${props.isHidden ? "hidden" : "flex"}
            ${props.cardBorderHidden ? "" : "px-2 py-1 block-border hover:outline-border relative"}`}
          style={{
            backgroundColor: props.cardBorderHidden
              ? "transparent"
              : "rgba(var(--bg-page), var(--bg-page-alpha))",
          }}
        >
          <SpeedyLink
            href={`/${props.token.id}`}
            className={`absolute w-full h-full top-0 left-0 no-underline hover:no-underline! text-primary`}
          />
          {props.showPreview && (
            <LeafletListPreview isVisible={isOnScreen} {...props} />
          )}
          <LeafletInfo isTemplate={isTemplate} {...props} />
        </div>
        {props.cardBorderHidden && (
          <hr
            className="last:hidden border-border-light"
            style={{
              display: props.isHidden ? "none" : "block",
            }}
          />
        )}
      </>
    );
  return (
    <div
      ref={previewRef}
      className={`
          relative
        flex flex-col gap-1 p-1 h-52 w-full
       block-border border-border! hover:outline-border
       ${props.isHidden ? "hidden" : "flex"}
        `}
      style={{
        backgroundColor: props.cardBorderHidden
          ? "transparent"
          : "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
      <SpeedyLink
        href={`/${props.token.id}`}
        className={`absolute w-full h-full top-0 left-0 no-underline hover:no-underline! text-primary`}
      />
      <div className="grow">
        <LeafletGridPreview {...props} isVisible={isOnScreen} />
      </div>
      <LeafletInfo
        isTemplate={isTemplate}
        className="px-1 pb-0.5 shrink-0"
        {...props}
      />
    </div>
  );
};

const LeafletLink = (props: { id: string; className: string }) => {
  return (
    <SpeedyLink
      href={`/${props.id}`}
      className={`no-underline hover:no-underline! text-primary ${props.className}`}
    />
  );
};
