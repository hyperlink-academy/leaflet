"use client";
import { PermissionToken, useEntity } from "src/replicache";
import { LeafletOptions } from "./LeafletOptions";
import Link from "next/link";
import { use, useState } from "react";
import { timeAgo } from "src/utils/timeAgo";
import { usePublishLink } from "components/ShareOptions";
import { Separator } from "components/Layout";
import { usePageTitle } from "components/utils/UpdateLeafletTitle";

export const LeafletInfo = (props: {
  title?: string;
  draftInPublication?: string;
  published?: boolean;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
  className?: string;
  display: "grid" | "list";
  added_at: string;
  publishedAt?: string;
  document_uri?: string;
  archived?: boolean | null;
}) => {
  let [prefetch, setPrefetch] = useState(false);
  let prettyCreatedAt = props.added_at ? timeAgo(props.added_at) : "";
  let prettyPublishedAt = props.publishedAt ? timeAgo(props.publishedAt) : "";

  // Look up root page first, like UpdateLeafletTitle does
  let firstPage = useEntity(props.leaflet_id, "root/page")[0];
  let entityID = firstPage?.data.value || props.leaflet_id;
  let titleFromDb = usePageTitle(entityID);

  let title = props.title ?? titleFromDb ?? "Untitled";

  return (
    <div
      className={`leafletInfo w-full min-w-0 flex flex-col ${props.className}`}
    >
      <div className="flex justify-between items-center shrink-0 max-w-full gap-2 leading-tight overflow-hidden">
        <h3 className="sm:text-lg text-base truncate w-full min-w-0">
          {title}
        </h3>
        <div className="flex gap-1 shrink-0">
          <LeafletOptions
            leaflet={props.token}
            draftInPublication={props.draftInPublication}
            document_uri={props.document_uri}
            shareLink={`/${props.token.id}`}
            archived={props.archived}
            loggedIn={props.loggedIn}
          />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        {props.archived ? (
          <div className="text-xs text-tertiary truncate">Archived</div>
        ) : props.draftInPublication || props.published ? (
          <div
            className={`text-xs w-max grow truncate ${props.published ? "font-bold text-tertiary" : "text-tertiary"}`}
          >
            {props.published
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
