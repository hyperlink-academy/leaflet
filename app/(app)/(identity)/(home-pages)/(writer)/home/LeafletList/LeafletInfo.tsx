"use client";
import { LeafletOptions } from "./LeafletOptions";
import { timeAgo } from "src/utils/timeAgo";
import { useLeafletPublicationStatus } from "components/PageSWRDataProvider";

export const LeafletInfo = (props: {
  title?: string;
  className?: string;
  display: "grid" | "list";
  added_at: string;
  archived?: boolean | null;
  loggedIn: boolean;
}) => {
  const pubStatus = useLeafletPublicationStatus();
  let prettyCreatedAt = props.added_at ? timeAgo(props.added_at) : "";
  let prettyPublishedAt = pubStatus?.publishedAt
    ? timeAgo(pubStatus.publishedAt)
    : "";

  let showTitle = props.loggedIn || !!props.title;
  let title = props.title ?? "Untitled";

  return (
    <div
      className={`leafletInfo w-full min-w-0 flex flex-col ${props.className}`}
    >
      <div className="flex justify-between items-center shrink-0 max-w-full gap-2 leading-tight overflow-hidden">
        {showTitle && (
          <h3 className="sm:text-lg text-base truncate w-full min-w-0">
            {title}
          </h3>
        )}
        <div className="flex gap-1 shrink-0 ml-auto">
          <LeafletOptions archived={props.archived} loggedIn={props.loggedIn} />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        {props.archived ? (
          <div className="text-xs text-tertiary truncate">Archived</div>
        ) : pubStatus?.draftInPublication || pubStatus?.isPublished ? (
          <div
            className={`text-xs w-max grow truncate ${pubStatus?.isPublished ? "font-bold text-tertiary" : "text-tertiary"}`}
          >
            {pubStatus?.isPublished
              ? `Published ${prettyPublishedAt}`
              : `Draft ${prettyCreatedAt}`}
          </div>
        ) : (
          <div className="text-xs text-tertiary grow w-max truncate">
            {prettyCreatedAt}
          </div>
        )}
      </div>
    </div>
  );
};
