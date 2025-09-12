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

export const LeafletListItem = (props: {
  title: string;
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

  if (props.display === "list")
    return (
      <>
        <div
          className={`flex gap-3 ${props.cardBorderHidden ? "" : "p-1 block-border hover:outline-border"}`}
          style={
            props.cardBorderHidden
              ? { backgroundColor: "transparent" }
              : {
                  backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
                }
          }
        >
          <LeafletListPreview {...props} />
          <LeafletInfo isTemplate={isTemplate} {...props} />
        </div>
        {props.cardBorderHidden && (
          <hr className="last:hidden border-border-light" />
        )}
      </>
    );
  return (
    <div
      className={`leafletGridListItem relative
        flex flex-col gap-1 p-1 h-52
       block-border !border-border hover:outline-border
        `}
      style={
        props.cardBorderHidden
          ? { backgroundColor: "transparent" }
          : {
              backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
            }
      }
    >
      <div className="grow">
        <LeafletGridPreview {...props} />
      </div>
      <LeafletInfo
        isTemplate={isTemplate}
        className="px-1 pb-0.5 shrink-0"
        {...props}
      />
      <LeafletTemplateIndicator isTemplate={isTemplate} />
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
    <div className="absolute -top-2 right-1">
      <TemplateSmall fill={theme.colors["bg-page"]} />
    </div>
  );
};
