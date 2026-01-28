"use client";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
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
import { PubLeafletComment } from "lexicons/api";
import { type CommentOnDocument } from "contexts/DocumentContext";
import { prefetchQuotesData } from "./Quotes";
import { useIdentityData } from "components/IdentityProvider";
import { ManageSubscription, SubscribeWithBluesky } from "app/lish/Subscribe";
import { EditTiny } from "components/Icons/EditTiny";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { RecommendButton } from "components/RecommendButton";

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
  recommendsCount: number;
  className?: string;
  showComments: boolean;
  showMentions: boolean;
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

  return (
    <div className={`flex gap-2 text-tertiary text-sm ${props.className}`}>
      {tagCount > 0 && <TagPopover tags={tags} tagCount={tagCount} />}

      <RecommendButton
        documentUri={document_uri}
        recommendsCount={props.recommendsCount}
      />

      {props.quotesCount === 0 || props.showMentions === false ? null : (
        <button
          className="flex w-fit gap-2 items-center"
          onClick={() => {
            if (!drawerOpen || drawer !== "quotes")
              openInteractionDrawer("quotes", document_uri, props.pageId);
            else setInteractionState(document_uri, { drawerOpen: false });
          }}
          onMouseEnter={handleQuotePrefetch}
          onTouchStart={handleQuotePrefetch}
          aria-label="Post quotes"
        >
          <QuoteTiny aria-hidden /> {props.quotesCount}
        </button>
      )}
      {props.showComments === false ? null : (
        <button
          className="flex gap-2 items-center w-fit"
          onClick={() => {
            if (!drawerOpen || drawer !== "comments" || pageId !== props.pageId)
              openInteractionDrawer("comments", document_uri, props.pageId);
            else setInteractionState(document_uri, { drawerOpen: false });
          }}
          aria-label="Post comments"
        >
          <CommentTiny aria-hidden /> {props.commentsCount}
        </button>
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
  pageId?: string;
}) => {
  const {
    uri: document_uri,
    quotesAndMentions,
    normalizedDocument,
    publication,
    leafletId,
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

  let noInteractions = !props.showComments && !props.showMentions;

  let subscribed =
    identity?.atp_did &&
    publication?.publication_subscriptions &&
    publication?.publication_subscriptions.find(
      (s) => s.identity === identity.atp_did,
    );

  let isAuthor =
    identity && identity.atp_did === publication?.identity_did && leafletId;

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
          <>
            <div className="flex gap-2">
              <RecommendButton
                documentUri={document_uri}
                recommendsCount={props.recommendsCount}
              />
              {props.quotesCount === 0 || !props.showMentions ? null : (
                <button
                  className="flex w-fit gap-2 items-center px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"
                  onClick={() => {
                    if (!drawerOpen || drawer !== "quotes")
                      openInteractionDrawer(
                        "quotes",
                        document_uri,
                        props.pageId,
                      );
                    else
                      setInteractionState(document_uri, { drawerOpen: false });
                  }}
                  onMouseEnter={handleQuotePrefetch}
                  onTouchStart={handleQuotePrefetch}
                  aria-label="Post quotes"
                >
                  <QuoteTiny aria-hidden /> {props.quotesCount}{" "}
                  <span
                    aria-hidden
                  >{`Mention${props.quotesCount === 1 ? "" : "s"}`}</span>
                </button>
              )}
              {!props.showComments ? null : (
                <button
                  className="flex gap-2 items-center w-fit px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"
                  onClick={() => {
                    if (
                      !drawerOpen ||
                      drawer !== "comments" ||
                      pageId !== props.pageId
                    )
                      openInteractionDrawer(
                        "comments",
                        document_uri,
                        props.pageId,
                      );
                    else
                      setInteractionState(document_uri, { drawerOpen: false });
                  }}
                  aria-label="Post comments"
                >
                  <CommentTiny aria-hidden />{" "}
                  {props.commentsCount > 0 ? (
                    <span aria-hidden>
                      {`${props.commentsCount} Comment${props.commentsCount === 1 ? "" : "s"}`}
                    </span>
                  ) : (
                    "Comment"
                  )}
                </button>
              )}
            </div>
          </>
        )}

        <EditButton publication={publication} leafletId={leafletId} />
        {subscribed && publication && (
          <ManageSubscription
            base_url={getPublicationURL(publication)}
            pub_uri={publication.uri}
            subscribers={publication.publication_subscriptions}
          />
        )}
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
        <div className="tags flex gap-1 items-center ">
          <TagTiny /> {props.tagCount}
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
    <div className="flex gap-1 flex-wrap">
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

export function getCommentCount(
  comments: CommentOnDocument[],
  pageId?: string,
) {
  if (pageId)
    return comments.filter(
      (c) => (c.record as PubLeafletComment.Record)?.onPage === pageId,
    ).length;
  else
    return comments.filter(
      (c) => !(c.record as PubLeafletComment.Record)?.onPage,
    ).length;
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
        className="flex gap-2 items-center hover:!no-underline selected-outline px-2 py-0.5 bg-accent-1 text-accent-2 font-bold w-fit rounded-lg !border-accent-1 !outline-accent-1"
      >
        <EditTiny /> Edit Post
      </a>
    );
  return null;
};
