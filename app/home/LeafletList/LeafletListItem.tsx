"use client";
import { PermissionToken } from "src/replicache";
import { deleteLeaflet } from "actions/deleteLeaflet";
import { removeDocFromHome } from "../storage";
import { mutate } from "swr";
import { ButtonPrimary } from "components/Buttons";
import { theme } from "tailwind.config";
import { useTemplateState } from "../Actions/CreateNewButton";
import { TemplateSmall } from "components/Icons/TemplateSmall";
import { LeafletListPreview, LeafletGridPreview } from "./LeafletPreview";
import { LeafletInfo } from "./LeafletInfo";
import Link from "next/link";
import { useState } from "react";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

export const LeafletListItem = (props: {
  draft?: boolean;
  published?: boolean;
  index: number;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
  display: "list" | "grid";
  cardBorderHidden: boolean;
}) => {
  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === props.token.id),
  );
  let [prefetch, setPrefetch] = useState(false);

  if (props.display === "list")
    return (
      <>
        <div
          className={`flex gap-3 ${props.cardBorderHidden ? "" : "bg-bg-page p-1 block-border hover:outline-border"}`}
        >
          <LeafletListPreview {...props} />
          <Link
            onMouseEnter={() => setPrefetch(true)}
            onPointerDown={() => setPrefetch(true)}
            prefetch={prefetch}
            href={`/${props.token.id}`}
            className={`no-underline sm:hover:no-underline text-primary w-full h-full py-1`}
          >
            <LeafletInfo isTemplate={isTemplate} {...props} />
          </Link>
        </div>
        {props.cardBorderHidden && (
          <hr className="last:hidden border-border-light" />
        )}
      </>
    );
  return (
    <div
      className={`leafletGridListItem relative
        flex flex-col h-52
        overflow-hidden block-border !border-border hover:outline-border
        ${props.cardBorderHidden ? "bg-transparent" : "bg-bg-page"}
        `}
    >
      <div className="grow p-1">
        <LeafletGridPreview {...props} />
      </div>
      <LeafletInfo isTemplate={isTemplate} className="px-2 py-1" {...props} />
      {/*in grid view, link needs to be handled as overlay on item since a tag
      cannot contain images etc*/}
      <LeafletPreviewLink
        id={props.token.id}
        prefetch={prefetch}
        setPrefetch={setPrefetch}
      />
    </div>
  );
};

const LeafletAreYouSure = (props: {
  token: PermissionToken;
  setState: (s: "normal" | "deleting") => void;
}) => {
  return (
    <div
      className="leafletContentWrapper w-full h-full px-1 pt-1 sm:px-[6px] sm:pt-2 flex flex-col gap-2 justify-center items-center "
      style={{
        backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
      <div className="font-bold text-center">
        Permanently delete this Leaflet?
      </div>
      <div className="flex gap-2 font-bold ">
        <ButtonPrimary
          compact
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteLeaflet(props.token);
            removeDocFromHome(props.token);
            mutate("leaflets");
          }}
        >
          Delete
        </ButtonPrimary>
        <button
          className="text-accent-1"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            props.setState("normal");
          }}
        >
          Nevermind
        </button>
      </div>
    </div>
  );
};

const LeafletTemplateIndicator = (props: { isTemplate: boolean }) => {
  if (!props.isTemplate) return;

  return (
    <div className="absolute -top-3 right-1">
      <TemplateSmall fill={theme.colors["bg-page"]} />
    </div>
  );
};

const LeafletPreviewLink = (props: {
  id: string;
  prefetch: boolean;
  setPrefetch: (value: boolean) => void;
}) => {
  return (
    <Link
      onMouseEnter={() => props.setPrefetch(true)}
      onPointerDown={() => props.setPrefetch(true)}
      prefetch={props.prefetch}
      href={`/${props.id}`}
      className={`no-underline sm:hover:no-underline text-primary absolute inset-0 w-full h-full`}
    />
  );
};
