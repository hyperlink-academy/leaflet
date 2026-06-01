"use client";
import { CommentTiny } from "components/Icons/CommentTiny";
import { flushSync } from "react-dom";
import type { Json } from "supabase/database.types";
import { create } from "zustand";
import type { Comment } from "./Comments";
import { decodeQuotePosition, QuotePosition } from "../quotePosition";
import { useDocument } from "contexts/DocumentContext";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { TagTiny } from "components/Icons/TagTiny";
import { Tag } from "components/Tags";
import { Popover } from "components/Popover";
import { prefetchQuotesData } from "./Quotes";
import { useIdentityData } from "components/IdentityProvider";
import { ManageSubscription } from "components/Subscribe/ManageSubscribe";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { EditTiny } from "components/Icons/EditTiny";
import { RecommendButton } from "components/RecommendButton";
import { ButtonSecondary } from "components/Buttons";
import { Separator } from "components/Layout";
import type { DrawerThread } from "./drawerThreadContext";

export type InteractionState = {
  drawerOpen: undefined | boolean;
  pageId?: string;
  drawer: undefined | "comments" | "quotes";
  localComments: Comment[];
  commentBox: { quote: QuotePosition | null };
  // Thread/quotes views opened within the drawer, innermost last. When
  // non-empty the drawer shows the top entry instead of the comments/mentions
  // tabs, with a back button to work up the tree.
  threadStack: DrawerThread[];
};

const defaultInteractionState: InteractionState = {
  drawerOpen: undefined,
  drawer: undefined,
  localComments: [],
  commentBox: { quote: null },
  threadStack: [],
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

      // The drawer counts as open if drawerOpen is explicitly true, or if it
      // was opened via the URL (drawerOpen still undefined but the param is
      // present). This mirrors useDrawerOpen — otherwise updating just the tab
      // while the drawer is param-opened would delete the param and close it.
      const drawerCurrentlyOpen =
        newDocState.drawerOpen === true ||
        (newDocState.drawerOpen === undefined &&
          url.searchParams.has("interactionDrawer"));

      if (drawerCurrentlyOpen && newDocState.drawer) {
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
    setInteractionState(document_uri, {
      drawerOpen: true,
      drawer,
      pageId,
      threadStack: [],
    });
  });
  scrollIntoView("interaction-drawer");
}

// Open the drawer straight onto a thread/quotes view. Used when a Bluesky post
// in the document body is clicked, so its thread opens in the drawer instead of
// a new page (mirroring how the post's own comments/mentions open the drawer).
export function openDrawerThread(
  document_uri: string,
  thread: DrawerThread,
  pageId?: string,
) {
  flushSync(() => {
    setInteractionState(document_uri, (s) => ({
      drawerOpen: true,
      drawer: s.drawer ?? "comments",
      pageId,
      threadStack: [thread],
    }));
  });
  scrollIntoView("interaction-drawer");
}

// Open a thread/quotes view inside the drawer, replacing its content. Clicking
// the view you're already on (e.g. the main post of the current thread) is a
// no-op rather than stacking a duplicate.
export function pushDrawerThread(document_uri: string, thread: DrawerThread) {
  setInteractionState(document_uri, (s) => {
    const top = s.threadStack[s.threadStack.length - 1];
    if (top && top.type === thread.type && top.uri === thread.uri) return {};
    return { threadStack: [...s.threadStack, thread] };
  });
}

// Step back up the drawer's thread navigation tree.
export function popDrawerThread(document_uri: string) {
  setInteractionState(document_uri, (s) => ({
    threadStack: s.threadStack.slice(0, -1),
  }));
}

// Jump all the way back out of the thread navigation, to the drawer's top
// level (the comments/mentions tabs).
export function popDrawerThreadToRoot(document_uri: string) {
  setInteractionState(document_uri, { threadStack: [] });
}

export const Interactions = (props: {
  quotesCount: number;
  commentsCount: number;
  recommendsCount: number;
  className?: string;
  showComments: boolean;
  showMentions: boolean;
  showRecommends: boolean;
  pageId?: string;
}) => {
  const {
    uri: document_uri,
    quotesAndMentions,
    normalizedDocument,
  } = useDocument();
  let { identity } = useIdentityData();

  let { drawerOpen, drawer, pageId } = useInteractionState(document_uri);

  const handleQuotePrefetch = () => {
    if (quotesAndMentions) {
      prefetchQuotesData(quotesAndMentions);
    }
  };

  const tags = normalizedDocument.tags;
  const tagCount = tags?.length || 0;

  let commentsAvailable = props.showComments;
  let mentionsAvailable = props.showMentions && props.quotesCount > 0;
  let discussionsAvailable = commentsAvailable || mentionsAvailable;
  let defaultDiscussionTab: "comments" | "quotes" =
    commentsAvailable && (props.commentsCount > 0 || !mentionsAvailable)
      ? "comments"
      : "quotes";

  let interactionsAvailable = discussionsAvailable || props.showRecommends;

  return (
    <div
      className={`flex gap-[10px] text-tertiary text-sm item-center ${props.className}`}
    >
      {props.showRecommends === false ? null : (
        <RecommendButton
          documentUri={document_uri}
          recommendsCount={props.recommendsCount}
        />
      )}

      {/*DISCUSSIONS BUTTON*/}
      {!discussionsAvailable ? null : (
        <button
          className="flex gap-1 items-center w-fit"
          onClick={() => {
            if (
              !drawerOpen ||
              (drawer !== "comments" && drawer !== "quotes") ||
              pageId !== props.pageId
            )
              openInteractionDrawer(
                defaultDiscussionTab,
                document_uri,
                props.pageId,
              );
            else setInteractionState(document_uri, { drawerOpen: false });
          }}
          onMouseEnter={handleQuotePrefetch}
          onTouchStart={handleQuotePrefetch}
          aria-label="Discussions"
        >
          <CommentTiny aria-hidden /> {props.commentsCount + props.quotesCount}
        </button>
      )}

      {tagCount > 0 && (
        <>
          {interactionsAvailable && <Separator classname="h-4!" />}
          <TagPopover tags={tags} tagCount={tagCount} />
        </>
      )}
    </div>
  );
};

export const ExpandedInteractions = (props: {
  quotesCount: number;
  commentsCount: number;
  recommendsCount: number;
  className?: string;
  showComments: boolean;
  showMentions: boolean;
  showRecommends: boolean;
  pageId?: string;
}) => {
  const {
    uri: document_uri,
    quotesAndMentions,
    normalizedDocument,
    publication,
    leafletId,
  } = useDocument();

  let { drawerOpen, drawer, pageId } = useInteractionState(document_uri);
  let viewer = useViewerSubscription(publication?.uri ?? "");

  const handleQuotePrefetch = () => {
    if (quotesAndMentions) {
      prefetchQuotesData(quotesAndMentions);
    }
  };

  const tags = normalizedDocument.tags;
  const tagCount = tags?.length || 0;

  let commentsAvailable = props.showComments;
  let mentionsAvailable = props.showMentions && props.quotesCount > 0;
  let discussionsAvailable = commentsAvailable || mentionsAvailable;
  let defaultDiscussionTab: "comments" | "quotes" =
    commentsAvailable && (props.commentsCount > 0 || !mentionsAvailable)
      ? "comments"
      : "quotes";

  let noInteractions = !discussionsAvailable && !props.showRecommends;

  return (
    <div
      className={`text-tertiary px-3 sm:px-4 flex flex-col ${props.className}`}
    >
      {tagCount > 0 && (
        <>
          <hr className="border-border-light mb-3" />

          <TagList tags={tags} className="mb-3" />
        </>
      )}

      <hr className="border-border-light mb-3 " />

      <div className="flex gap-2 justify-between">
        {noInteractions ? (
          <div />
        ) : (
          <div className="flex flex-col gap-2 just">
            <div className="flex gap-2 sm:flex-row flex-col">
              {props.showRecommends === false ? null : (
                <RecommendButton
                  documentUri={document_uri}
                  recommendsCount={props.recommendsCount}
                  expanded
                />
              )}
              {!discussionsAvailable ? null : (
                <ButtonSecondary
                  onClick={() => {
                    if (
                      !drawerOpen ||
                      (drawer !== "comments" && drawer !== "quotes") ||
                      pageId !== props.pageId
                    )
                      openInteractionDrawer(
                        defaultDiscussionTab,
                        document_uri,
                        props.pageId,
                      );
                    else
                      setInteractionState(document_uri, { drawerOpen: false });
                  }}
                  onMouseEnter={handleQuotePrefetch}
                  onTouchStart={handleQuotePrefetch}
                  aria-label="Discussions"
                >
                  <CommentTiny aria-hidden />
                  {props.quotesCount + props.commentsCount !== 0 && (
                    <>
                      {props.quotesCount + props.commentsCount}{" "}
                      <Separator classname="h-4! text-accent-contrast!" />
                    </>
                  )}
                  Discussion
                </ButtonSecondary>
              )}
            </div>
          </div>
        )}

        <EditButton publication={publication} leafletId={leafletId} />
      </div>
    </div>
  );
};

const TagPopover = (props: {
  tagCount: number;
  tags: string[] | undefined;
}) => {
  return (
    <Popover
      className="p-2! max-w-xs"
      trigger={
        <div
          className="tags flex gap-1 items-center"
          aria-label={`${props.tagCount} tag${props.tagCount === 1 ? "" : "s"}`}
        >
          <TagTiny aria-hidden /> {props.tagCount}
        </div>
      }
    >
      <TagList tags={props.tags} className="text-secondary!" />
    </Popover>
  );
};

const TagList = (props: { className?: string; tags: string[] | undefined }) => {
  if (!props.tags) return;
  return (
    <div className="flex gap-1 flex-wrap" role="list" aria-label="Tags">
      {props.tags.map((tag, index) => (
        <Tag name={tag} key={index} className={props.className} />
      ))}
    </div>
  );
};
export function getQuoteCount(
  quotesAndMentions: { uri: string; link?: string }[],
  pageId?: string,
) {
  return getQuoteCountFromArray(quotesAndMentions, pageId);
}

export function getQuoteCountFromArray(
  quotesAndMentions: { uri: string; link?: string }[],
  pageId?: string,
) {
  if (pageId) {
    return quotesAndMentions.filter((q) => {
      if (!q.link) return false;
      return q.link.includes(pageId);
    }).length;
  } else {
    return quotesAndMentions.filter((q) => {
      if (!q.link) return true; // Direct mentions go to main page
      const url = new URL(q.link);
      const quoteParam = url.pathname.split("/l-quote/")[1];
      if (!quoteParam) return true;
      const quotePosition = decodeQuotePosition(quoteParam);
      return !quotePosition?.pageId;
    }).length;
  }
}

const EditButton = (props: {
  publication: { identity_did: string } | null;
  leafletId: string | null;
}) => {
  let { identity } = useIdentityData();
  if (
    identity &&
    identity.atp_did === props.publication?.identity_did &&
    props.leafletId
  )
    return (
      <a
        href={`https://leaflet.pub/${props.leafletId}`}
        className="flex gap-2 items-center hover:!no-underline selected-outline px-2 py-0.5 bg-accent-1 text-accent-2 font-bold w-fit rounded-md !border-accent-1 !outline-accent-1 h-fit"
      >
        <EditTiny /> Edit Post
      </a>
    );
  return null;
};
