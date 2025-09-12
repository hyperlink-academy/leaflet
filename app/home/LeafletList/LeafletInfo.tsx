"use client";
import { PermissionToken } from "src/replicache";
import { LeafletOptions } from "./LeafletOptions";

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
  return (
    <div className={`leafletInfo flex flex-col w-full ${props.className}`}>
      <div className="flex justify-between shrink-0 w-full gap-2 leading-tight">
        <h3 className="grow truncate">{props.title}</h3>

        <LeafletOptions
          leaflet={props.token}
          isTemplate={props.isTemplate}
          loggedIn={props.loggedIn}
        />
      </div>
      {props.draft || props.published ? (
        <div
          className={`text-xs  italic ${props.published ? "font-bold text-tertiary" : "text-tertiary"}`}
        >
          {props.published ? "Published xx/xx/xx" : "Draft Edited xx/xx/xx"}
        </div>
      ) : (
        <div className="text-xs text-tertiary italic">Edited xx/xx/xx</div>
      )}
    </div>
  );
};
