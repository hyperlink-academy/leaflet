"use client";
import { LeafletListPreview, LeafletGridPreview } from "./LeafletPreview";
import { LeafletInfo } from "./LeafletInfo";
import { useRef, useEffect } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { useLeafletPublicationStatus } from "components/PageSWRDataProvider";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { useReportCardVisible } from "./LeafletCardReplicache";

export const LeafletListItem = (props: {
  archived?: boolean | null;
  loggedIn: boolean;
  display: "list" | "grid";
  added_at: string;
  title?: string;
  isHidden: boolean;
  showPreview?: boolean;
}) => {
  const cardBorderHidden = useCardBorderHidden();
  const pubStatus = useLeafletPublicationStatus();
  const visibilityReporter = useReportCardVisible();
  let previewRef = useRef<HTMLDivElement | null>(null);

  // Report once and stop watching: a card that has been seen keeps its
  // preview, so scrolling it away must not take the content back off.
  useEffect(() => {
    if (!previewRef.current) return;
    let observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        visibilityReporter?.notifyVisible();
        observer.disconnect();
      },
      { threshold: 0.1 },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [visibilityReporter]);

  const tokenId = pubStatus?.shareLink ?? "";

  if (props.display === "list")
    return (
      <>
        <div
          ref={previewRef}
          className={`relative flex gap-3 w-full
            ${props.isHidden ? "hidden" : "flex"}
            ${cardBorderHidden ? "" : "px-2 py-1 block-border hover:outline-border! relative"}`}
          style={{
            backgroundColor: cardBorderHidden
              ? "transparent"
              : "rgba(var(--bg-page), var(--bg-page-alpha))",
          }}
        >
          <SpeedyLink
            href={`/${tokenId}`}
            className={`absolute w-full h-full top-0 left-0 no-underline! hover:no-underline! text-primary`}
          />
          {props.showPreview && <LeafletListPreview />}
          <LeafletInfo
            title={props.title}
            display={props.display}
            added_at={props.added_at}
            archived={props.archived}
            loggedIn={props.loggedIn}
          />
        </div>
        {cardBorderHidden && (
          <hr
            className={`${props.isHidden ? "hidden" : "block last:hidden"} border-border-light`}
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
       block-border border-border! hover:outline-border!
       ${props.isHidden ? "hidden" : "flex"}
        `}
      style={{
        backgroundColor: cardBorderHidden
          ? "transparent"
          : "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
      <SpeedyLink
        href={`/${tokenId}`}
        className={`absolute w-full h-full top-0 left-0 no-underline hover:no-underline! text-primary`}
      />
      <div className="grow">
        <LeafletGridPreview />
      </div>
      <LeafletInfo
        className="px-1 pb-0.5 shrink-0"
        title={props.title}
        display={props.display}
        added_at={props.added_at}
        archived={props.archived}
        loggedIn={props.loggedIn}
      />
    </div>
  );
};
