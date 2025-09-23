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

type InteractionState = {
  drawerOpen: undefined | boolean;
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

export function useInteractionState(document_uri?: string) {
  return useInteractionStateStore((state) => {
    if (!document_uri || !state[document_uri]) {
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
) {
  flushSync(() => {
    setInteractionState(document_uri, { drawerOpen: true, drawer });
  });
  let el = document.getElementById("interaction-drawer");
  let isOffscreen = false;
  if (el) {
    const rect = el.getBoundingClientRect();
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;
    isOffscreen = rect.right > windowWidth - 64;
  }

  if (el && isOffscreen)
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
}

export const Interactions = (props: {
  quotesCount: number;
  commentsCount: number;
  compact?: boolean;
  className?: string;
  showComments?: boolean;
}) => {
  const data = useContext(PostPageContext);
  const document_uri = data?.uri;
  if (!document_uri)
    throw new Error("document_uri not available in PostPageContext");

  let { drawerOpen, drawer } = useInteractionState(document_uri);

  return (
    <div
      className={`flex gap-2 text-tertiary ${props.compact ? "text-sm" : ""} ${props.className}`}
    >
      <button
        className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
        onClick={() => {
          if (!drawerOpen || drawer !== "quotes")
            openInteractionDrawer("quotes", document_uri);
          else setInteractionState(document_uri, { drawerOpen: false });
        }}
      >
        <span className="sr-only">Post quotes</span>
        <QuoteTiny aria-hidden /> {props.quotesCount}{" "}
        {!props.compact &&
          `<span aria-hidden>Quote${props.quotesCount === 1 ? "" : "s"}</span>`}
      </button>
      {props.showComments === false ? null : (
        <button
          className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
          onClick={() => {
            if (!drawerOpen || drawer !== "comments")
              openInteractionDrawer("comments", document_uri);
            else setInteractionState(document_uri, { drawerOpen: false });
          }}
        >
          <span className="sr-only">Post comments</span>
          <CommentTiny aria-hidden /> {props.commentsCount}{" "}
          {!props.compact &&
            `<span aria-hidden>Comment${props.commentsCount === 1 ? "" : "s"}</span>`}
        </button>
      )}
    </div>
  );
};
