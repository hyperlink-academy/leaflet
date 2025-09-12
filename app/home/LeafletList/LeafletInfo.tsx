"use client";
import { PermissionToken } from "src/replicache";
import { LeafletOptions } from "./LeafletOptions";
import Link from "next/link";
import { useState } from "react";

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
}) => {
  let [prefetch, setPrefetch] = useState(false);

  return (
    <div className={`leafletInfo -full py-1 flex flex-col ${props.className}`}>
      <div className="flex justify-between shrink-0 w-full gap-2 leading-tight">
        <Link
          onMouseEnter={() => setPrefetch(true)}
          onPointerDown={() => setPrefetch(true)}
          prefetch={prefetch}
          href={`/${props.token.id}`}
          className="no-underline sm:hover:no-underline text-primary w-full"
        >
          <h3 className="grow truncate">{props.title}</h3>
        </Link>

        <LeafletOptions
          leaflet={props.token}
          isTemplate={props.isTemplate}
          loggedIn={props.loggedIn}
        />
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
            className={`text-xs  italic ${props.published ? "font-bold text-tertiary" : "text-tertiary"}`}
          >
            {props.published ? "Published xx/xx/xx" : "Draft Edited xx/xx/xx"}
          </div>
        ) : (
          <div className="text-xs text-tertiary italic">Edited xx/xx/xx</div>
        )}
      </Link>
    </div>
  );
};
