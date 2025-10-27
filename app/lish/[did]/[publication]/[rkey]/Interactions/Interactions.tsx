"use client";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { flushSync } from "react-dom";
import type { Json } from "supabase/database.types";
import { create } from "zustand";
import type { Comment } from "./Comments";
import { QuotePosition } from "../quotePosition";
import { useContext } from "react";
import { PostPageContext } from "../PostPageContext";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { TagTiny } from "components/Icons/TagTiny";
import { Tag } from "components/Tags";

export type InteractionState = {
  drawerOpen: undefined | boolean;
  pageId?: string;
  drawer: undefined | "comments" | "quotes";
  localComments: Comment[];
  commentBox: { quote: QuotePosition | null };
};

const defaultInteractionState: InteractionState = {
  drawerOpen: undefined,
  drawer: undefined,
  localComments: [],
  commentBox: { quote: null },
};

export let useInteractionStateStore = create<{
  [document_uri: string]: InteractionState;
}>(() => ({}));

export function useInteractionState(document_uri: string) {
  return useInteractionStateStore((state) => {
    if (!state[document_uri]) {
      return defaultInteractionState;
    }
    return state[document_uri];
  });
}

export function setInteractionState(
  document_uri: string,
  update:
    | Partial<InteractionState>
    | ((state: InteractionState) => Partial<InteractionState>),
) {
  useInteractionStateStore.setState((state) => {
    if (!state[document_uri]) {
      state[document_uri] = { ...defaultInteractionState };
    }

    const currentDocState = state[document_uri];
    const updatedState =
      typeof update === "function" ? update(currentDocState) : update;

    const newState = {
      ...state,
      [document_uri]: {
        ...currentDocState,
        ...updatedState,
      },
    };

    // Update query parameter when drawer state changes
    if (
      typeof window !== "undefined" &&
      (updatedState.drawerOpen !== undefined ||
        updatedState.drawer !== undefined)
    ) {
      const url = new URL(window.location.href);
      const newDocState = newState[document_uri];

      if (newDocState.drawerOpen && newDocState.drawer) {
        url.searchParams.set("interactionDrawer", newDocState.drawer);
      } else {
        url.searchParams.delete("interactionDrawer");
      }

      window.history.replaceState({}, "", url.toString());
    }

    return newState;
  });
}
export function openInteractionDrawer(
  drawer: "comments" | "quotes",
  document_uri: string,
  pageId?: string,
) {
  flushSync(() => {
    setInteractionState(document_uri, { drawerOpen: true, drawer, pageId });
  });
  scrollIntoView("interaction-drawer");
}

export const Interactions = (props: {
  quotesCount: number;
  commentsCount: number;
  compact?: boolean;
  className?: string;
  showComments?: boolean;
  pageId?: string;
}) => {
  const data = useContext(PostPageContext);
  const document_uri = data?.uri;
  if (!document_uri)
    throw new Error("document_uri not available in PostPageContext");

  let { drawerOpen, drawer, pageId } = useInteractionState(document_uri);

  return (
    <div className="flex flex-col">
      <div
        className={`flex gap-2 items-center not-only:text-tertiary ${props.compact ? "text-sm" : "px-3 sm:px-4"} ${props.className}`}
      >
        {props.compact && (
          <button
            className="flex gap-1 items-center "
            onClick={() => {
              if (!drawerOpen || drawer !== "quotes")
                openInteractionDrawer("quotes", document_uri, props.pageId);
              else setInteractionState(document_uri, { drawerOpen: false });
            }}
          >
            <TagTiny /> XX
          </button>
        )}
        <button
          className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
          onClick={() => {
            if (!drawerOpen || drawer !== "quotes")
              openInteractionDrawer("quotes", document_uri, props.pageId);
            else setInteractionState(document_uri, { drawerOpen: false });
          }}
          aria-label="Post quotes"
        >
          <QuoteTiny aria-hidden /> {props.quotesCount}{" "}
          {!props.compact && (
            <span
              aria-hidden
            >{`Quote${props.quotesCount === 1 ? "" : "s"}`}</span>
          )}
        </button>
        {props.showComments === false ? null : (
          <button
            className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
            onClick={() => {
              if (
                !drawerOpen ||
                drawer !== "comments" ||
                pageId !== props.pageId
              )
                openInteractionDrawer("comments", document_uri, props.pageId);
              else setInteractionState(document_uri, { drawerOpen: false });
            }}
            aria-label="Post comments"
          >
            <CommentTiny aria-hidden /> {props.commentsCount}{" "}
            {!props.compact && (
              <span
                aria-hidden
              >{`Comment${props.commentsCount === 1 ? "" : "s"}`}</span>
            )}
          </button>
        )}
      </div>

      {!props.compact && (
        <TagList
          drawerOpen={drawerOpen}
          drawer={drawer}
          document_uri={document_uri}
          pageId={props.pageId}
        />
      )}
    </div>
  );
};

const TagList = (props: {
  drawerOpen: boolean | undefined;
  drawer: string | undefined;
  document_uri: string;
  pageId: string | undefined;
}) => {
  return (
    <div className="flex flex-col gap-3 px-3 sm:px-4 pt-2">
      <hr className="border-border-light" />
      <div className="flex gap-1 flex-wrap">
        {Tags.map((tag, index) => (
          <Tag
            name={tag}
            key={index}
            onClick={() => {
              if (!props.drawerOpen || props.drawer !== "quotes")
                openInteractionDrawer(
                  "quotes",
                  props.document_uri,
                  props.pageId,
                );
              else
                setInteractionState(props.document_uri, { drawerOpen: false });
            }}
          />
        ))}
      </div>
    </div>
  );
};

const Tags = ["Hello", "these are", "some tags"];
