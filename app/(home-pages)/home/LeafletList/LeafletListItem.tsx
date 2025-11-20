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
  draft?: boolean;
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
        <LeafletLink
          id={props.token.id}
          className={`w-full ${props.isHidden ? "hidden" : "block"}`}
        >
          <div
            ref={previewRef}
            className={`flex gap-3 w-full ${props.cardBorderHidden ? "" : "px-2 py-1 block-border hover:outline-border relative"}`}
            style={{
              backgroundColor: props.cardBorderHidden
                ? "transparent"
                : "rgba(var(--bg-page), var(--bg-page-alpha))",
            }}
          >
            {props.showPreview && (
              <LeafletListPreview isVisible={isOnScreen} {...props} />
            )}
            <LeafletInfo isTemplate={isTemplate} {...props} />
          </div>
        </LeafletLink>
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
    <LeafletLink
      id={props.token.id}
      className={`leafletGridListItem relative w-full ${props.isHidden ? "hidden" : "flex"}`}
    >
      <div
        ref={previewRef}
        className={`
        flex flex-col gap-1 p-1 h-52 w-full
       block-border border-border! hover:outline-border
        `}
        style={{
          backgroundColor: props.cardBorderHidden
            ? "transparent"
            : "rgba(var(--bg-page), var(--bg-page-alpha))",
        }}
      >
        <div className="grow">
          <LeafletGridPreview {...props} isVisible={isOnScreen} />
        </div>
        <LeafletInfo
          isTemplate={isTemplate}
          className="px-1 pb-0.5 shrink-0"
          {...props}
        />
      </div>
    </LeafletLink>
  );
};

const LeafletLink = (props: {
  id: string;
  children: React.ReactNode;
  className: string;
}) => {
  return (
    <SpeedyLink
      href={`/${props.id}`}
      className={`no-underline hover:no-underline! text-primary ${props.className}`}
    >
      {props.children}
    </SpeedyLink>
  );
};
