"use client";
import { PermissionToken } from "src/replicache";
import { LeafletOptions } from "./LeafletOptions";
import Link from "next/link";
import { useState } from "react";
import { theme } from "tailwind.config";
import { TemplateSmall } from "components/Icons/TemplateSmall";

export const LeafletInfo = (props: {
  title?: string;
  draft?: boolean;
  published?: boolean;
  index: number;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
  isTemplate: boolean;
  className?: string;
  display: "grid" | "list";
  added_at: string;
  publishedAt?: string;
}) => {
  let [prefetch, setPrefetch] = useState(false);
  let prettyCreatedAt = props.added_at
    ? new Date(props.added_at).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "";

  let prettyPublishedAt =
    props.publishedAt &&
    new Date(props.publishedAt).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

  return (
    <div
      className={`leafletInfo w-full min-w-0 py-1 flex flex-col ${props.className}`}
    >
      <div className="flex justify-between shrink-0 max-w-full gap-2 leading-tight overflow-hidden">
        <Link
          onMouseEnter={() => setPrefetch(true)}
          onPointerDown={() => setPrefetch(true)}
          prefetch={prefetch}
          href={`/${props.token.id}`}
          className="no-underline sm:hover:no-underline text-primary grow min-w-0"
        >
          <h3 className=" truncate w-full min-w-0">{props.title}</h3>
        </Link>
        <div className="flex gap-1 shrink-0">
          {!props.isTemplate && props.display === "list" ? (
            <TemplateSmall
              fill={theme.colors["bg-page"]}
              className="text-tertiary"
            />
          ) : null}
          <LeafletOptions
            leaflet={props.token}
            isTemplate={props.isTemplate}
            loggedIn={props.loggedIn}
            added_at={props.added_at}
          />
        </div>
      </div>
      <Link
        onMouseEnter={() => setPrefetch(true)}
        onPointerDown={() => setPrefetch(true)}
        prefetch={prefetch}
        href={`/${props.token.id}`}
        className="no-underline sm:hover:no-underline text-primary w-full"
      >
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
      </Link>
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
