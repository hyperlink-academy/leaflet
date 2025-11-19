"use client";
import { PermissionToken } from "src/replicache";
import { LeafletOptions } from "./LeafletOptions";
import Link from "next/link";
import { use, useState } from "react";
import { theme } from "tailwind.config";
import { TemplateSmall } from "components/Icons/TemplateSmall";
import { timeAgo } from "src/utils/timeAgo";
import { usePublishLink } from "components/ShareOptions";

export const LeafletInfo = (props: {
  title?: string;
  draft?: boolean;
  published?: boolean;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
  isTemplate: boolean;
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

  return (
    <div
      className={`leafletInfo w-full min-w-0 flex flex-col ${props.className}`}
    >
      <div className="flex justify-between items-center shrink-0 max-w-full gap-2 leading-tight overflow-hidden">
        <h3 className="sm:text-lg text-base truncate w-full min-w-0">
          {props.title}
        </h3>
        <div className="flex gap-1 shrink-0">
          {props.isTemplate && props.display === "list" ? (
            <TemplateSmall
              fill={theme.colors["bg-page"]}
              className="text-tertiary"
            />
          ) : null}
          <LeafletOptions
            leaflet={props.token}
            isTemplate={props.isTemplate}
            draft={props.draft}
            document_uri={props.document_uri}
            shareLink={`/${props.token.id}`}
            archived={props.archived}
          />
        </div>
      </div>
      {props.draft || props.published ? (
        <div
          className={`text-xs ${props.published ? "font-bold text-tertiary" : "text-tertiary"}`}
        >
          {props.published
            ? `Published ${prettyPublishedAt}`
            : `Draft ${prettyCreatedAt}`}
        </div>
      ) : (
        <div className="text-xs text-tertiary">{prettyCreatedAt}</div>
      )}
      {props.archived && <div className="text-xs text-tertiary">archived</div>}
      {props.isTemplate && props.display === "grid" ? (
        <div className="absolute -top-2 right-1">
          <TemplateSmall
            className="text-tertiary"
            fill={theme.colors["bg-page"]}
          />
        </div>
      ) : null}
    </div>
  );
};
