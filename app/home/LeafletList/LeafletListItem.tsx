"use client";
import { PermissionToken } from "src/replicache";
import { useTemplateState } from "../Actions/CreateNewButton";
import { LeafletListPreview, LeafletGridPreview } from "./LeafletPreview";
import { LeafletInfo } from "./LeafletInfo";

export const LeafletListItem = (props: {
  index: number;
  token: PermissionToken;
  leaflet_id: string;
  loggedIn: boolean;
  display: "list" | "grid";
  cardBorderHidden: boolean;
  added_at: string;
  title: string;
  draft?: boolean;
  published?: boolean;
  publishedAt?: string;
}) => {
  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === props.token.id),
  );

  if (props.display === "list")
    return (
      <>
        <div
          className={`flex gap-3 w-full ${props.cardBorderHidden ? "" : "p-1 block-border hover:outline-border"}`}
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
    </div>
  );
};
