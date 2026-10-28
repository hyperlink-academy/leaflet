"use client";
import { LeafletListPreview, LeafletGridPreview } from "./LeafletPreview";
import { LeafletInfo } from "./LeafletInfo";
import { useState, useRef, useEffect } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { useLeafletPublicationStatus } from "components/PageSWRDataProvider";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { useReportCardVisible } from "./LeafletCardReplicache";
import { leaveHome } from "./HomeLeafletFactsProvider";
import { EAGERLY_VISIBLE_CARDS } from "src/utils/homeLeaflets";

export const LeafletListItem = (props: {
  archived?: boolean | null;
  loggedIn: boolean;
  display: "list" | "grid";
  added_at: string;
  title?: string;
  index: number;
  isHidden: boolean;
  showPreview?: boolean;
}) => {
  const cardBorderHidden = useCardBorderHidden();
  const pubStatus = useLeafletPublicationStatus();
  const visibilityReporter = useReportCardVisible();
  let [isOnScreen, setIsOnScreen] = useState(
    props.index < EAGERLY_VISIBLE_CARDS,
  );
  let previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewRef.current) return;
    let observer = new IntersectionObserver(
      (entries) => {
        for (let { isIntersecting } of entries) {
          setIsOnScreen(isIntersecting);
          if (isIntersecting) visibilityReporter?.notifyVisible();
        }
      },
      { threshold: 0.1, root: null },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [previewRef, visibilityReporter]);

  const link = (
    <SpeedyLink
      href={`/${pubStatus?.shareLink ?? ""}`}
      onNavigate={leaveHome}
      className={`absolute w-full h-full top-0 left-0 no-underline! hover:no-underline! text-primary`}
    />
  );

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
          {link}
          {props.showPreview && <LeafletListPreview isVisible={isOnScreen} />}
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
      {link}
      <div className="grow">
        <LeafletGridPreview isVisible={isOnScreen} />
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
