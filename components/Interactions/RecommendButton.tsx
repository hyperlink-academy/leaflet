"use client";

import { useContext, useState } from "react";
import useSWR, { mutate } from "swr";
import { create, windowScheduler } from "@yornaath/batshit";
import {
  RecommendEmptyTiny,
  RecommendFilledTiny,
} from "../Icons/RecommendTiny";
import { RecommendEmptySmall } from "../Icons/RecommendEmptySmall";
import { RecommendFilledSmall } from "../Icons/RecommendFilledSmall";
import {
  recommendAction,
  unrecommendAction,
} from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/recommendAction";
import { callRPC } from "app/api/rpc/client";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { useSmoker, useToaster } from "../Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "../OAuthError";
import { useIdentityData } from "../IdentityProvider";
import { LoginModal } from "../LoginButton";
import { Modal } from "../Modal";
import { MobileSheet } from "../MobileSheet";
import { useIsMobile } from "src/hooks/isMobile";
import { RecommendsList, getDocumentRecommendsKey } from "./RecommendsList";
import { DrawerThreadContext } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";
import {
  InteractionButton,
  LargeInteractionButton,
} from "./InteractionButtons";

// Create a batcher for recommendation checks
// Batches requests made within 10ms window
const recommendationBatcher = create({
  fetcher: async (documentUris: string[]) => {
    const response = await callRPC("get_user_recommendations", {
      documentUris,
    });
    return response.result;
  },
  resolver: (results, documentUri) => results[documentUri] ?? false,
  scheduler: windowScheduler(10),
});

const getRecommendationKey = (documentUri: string) =>
  `recommendation:${documentUri}`;

// The recommends count lives in a shared SWR cache (seeded from the server prop
// via fallbackData) rather than local state, so every RecommendButton for the
// same document — the inline button, the one in the RecommendsModal, etc. —
// reflects the same optimistic count.
const getRecommendCountKey = (documentUri: string) =>
  `recommendation-count:${documentUri}`;

function useUserRecommendation(documentUri: string) {
  const { identity } = useIdentityData();
  const { data: hasRecommended, isLoading } = useSWR(
    identity?.atp_did ? getRecommendationKey(documentUri) : null,
    () => recommendationBatcher.fetch(documentUri),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  );

  return {
    hasRecommended: hasRecommended ?? false,
    isLoading,
  };
}

function mutateRecommendation(documentUri: string, hasRecommended: boolean) {
  mutate(getRecommendationKey(documentUri), hasRecommended, {
    revalidate: false,
  });
}

function mutateRecommendCount(
  documentUri: string,
  updater: (count: number) => number,
  fallback: number,
) {
  mutate(
    getRecommendCountKey(documentUri),
    (c: number | undefined) => updater(c ?? fallback),
    { revalidate: false },
  );
}

// Add or remove a did from the cached recommender list so RecommendsList shows
// the change immediately. The server write is synchronous, so a later revalidate
// (e.g. when the modal mounts) reconciles ordering and other recommenders.
function mutateDocumentRecommends(
  documentUri: string,
  did: string,
  recommended: boolean,
) {
  mutate(
    getDocumentRecommendsKey(documentUri),
    (dids: string[] | undefined) => {
      const current = dids ?? [];
      if (recommended)
        return current.includes(did) ? current : [did, ...current];
      return current.filter((d) => d !== did);
    },
    { revalidate: false },
  );
}

/**
 * Encapsulates the recommendation state and toggle handler so multiple button
 * styles (the tiny inline button and the expanded ButtonSecondary) can share
 * the same optimistic logic. Fetches the user's status asynchronously via SWR
 * with batched requests for efficient fetching when many buttons are rendered.
 */
export function useRecommendPost(documentUri: string, recommendsCount: number) {
  const { hasRecommended, isLoading } = useUserRecommendation(documentUri);
  const { identity } = useIdentityData();
  const { data: count = recommendsCount } = useSWR<number>(
    getRecommendCountKey(documentUri),
    null,
    { fallbackData: recommendsCount },
  );
  const [isPending, setIsPending] = useState(false);
  const [optimisticRecommended, setOptimisticRecommended] = useState<
    boolean | null
  >(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const toaster = useToaster();
  const smoker = useSmoker();

  // Use optimistic state if set, otherwise use fetched state
  const displayRecommended =
    optimisticRecommended !== null ? optimisticRecommended : hasRecommended;

  const recommendPost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending || isLoading) return;
    if (!identity?.atp_did) {
      setLoginOpen(true);
      return;
    }

    const currentlyRecommended = displayRecommended;
    const myDid = identity.atp_did;
    setIsPending(true);
    setOptimisticRecommended(!currentlyRecommended);
    mutateRecommendCount(
      documentUri,
      (c) => (currentlyRecommended ? c - 1 : c + 1),
      recommendsCount,
    );
    mutateDocumentRecommends(documentUri, myDid, !currentlyRecommended);

    if (!currentlyRecommended) {
      smoker({
        position: {
          x: e.clientX,
          y: e.clientY - 16,
        },
        text: <div className="text-xs">Recc'd!</div>,
      });
    }

    const result = currentlyRecommended
      ? await unrecommendAction({ document: documentUri })
      : await recommendAction({ document: documentUri });
    if (!result.success) {
      // Revert optimistic update
      setOptimisticRecommended(null);
      mutateRecommendCount(
        documentUri,
        (c) => (currentlyRecommended ? c + 1 : c - 1),
        recommendsCount,
      );
      mutateDocumentRecommends(documentUri, myDid, currentlyRecommended);
      setIsPending(false);

      toaster({
        content: isOAuthSessionError(result.error) ? (
          <OAuthErrorMessage error={result.error} />
        ) : (
          "Oh no! Something went wrong!"
        ),
        type: "error",
      });
      return;
    }

    // Update the SWR cache to match the new state
    mutateRecommendation(documentUri, !currentlyRecommended);
    setOptimisticRecommended(null);
    setIsPending(false);
  };

  return {
    displayRecommended,
    count,
    recommendPost,
    loginOpen,
    setLoginOpen,
  };
}

export function RecommendButton(props: {
  documentUri: string;
  recommendsCount: number;
  recommendOnly?: boolean;
  large?: boolean;
  className?: string;
}) {
  const { displayRecommended, count, recommendPost, loginOpen, setLoginOpen } =
    useRecommendPost(props.documentUri, props.recommendsCount);
  const [recommendsModalOpen, setRecommendsModalOpen] = useState(false);
  // Inside a post body (or the post footer) a DrawerThreadContext is in scope;
  // there the recommenders open in the interaction drawer, mirroring how the
  // discussion count does. Elsewhere (listings, feeds) they open in a modal.
  const drawerNav = useContext(DrawerThreadContext);

  const ButtonWrapper = props.large
    ? LargeInteractionButton
    : InteractionButton;
  const FilledIcon = props.large ? RecommendFilledSmall : RecommendFilledTiny;
  const EmptyIcon = props.large ? RecommendEmptySmall : RecommendEmptyTiny;

  return (
    <>
      <ButtonWrapper
        onClick={recommendPost}
        ariaLabel={displayRecommended ? "Remove recommend" : "Recommend"}
        className={props.className}
      >
        {displayRecommended ? <FilledIcon /> : <EmptyIcon />}
        {count > 0 ? (
          !props.recommendOnly ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (drawerNav)
                  drawerNav.push({
                    type: "recommends",
                    uri: props.documentUri,
                  });
                else setRecommendsModalOpen(true);
              }}
              className={`relative  z-10 ${props.large ? "" : "hover:text-accent-contrast"}`}
              aria-label="See who recommended this"
            >
              {count}
            </button>
          ) : (
            count
          )
        ) : null}
      </ButtonWrapper>

      {recommendsModalOpen && (
        <RecommendsModal
          documentUri={props.documentUri}
          recommendCount={props.recommendsCount}
          open={recommendsModalOpen}
          onOpenChange={setRecommendsModalOpen}
        />
      )}
      {loginOpen && (
        <LoginModal
          noEmailLogin
          open={loginOpen}
          onOpenChange={setLoginOpen}
          action={encodeActionToSearchParam({
            action: "recommend",
            document: props.documentUri,
          })}
        />
      )}
    </>
  );
}

// Lists the profiles that have recommended a document. On mobile this slides up
// in a sheet (like the interaction drawer / DiscussionModal) instead of a
// centered modal.

function RecommendsModal(props: {
  documentUri: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendCount: number;
}) {
  const isMobile = useIsMobile();

  if (isMobile)
    return (
      <MobileSheet
        title="Recommended by"
        open={props.open}
        onOpenChange={props.onOpenChange}
        actionButton={
          <RecommendButton
            documentUri={props.documentUri}
            recommendsCount={props.recommendCount}
            recommendOnly
            large
          />
        }
      >
        <RecommendsList documentUri={props.documentUri} />{" "}
      </MobileSheet>
    );

  return (
    <Modal
      title={`Recommends`}
      open={props.open}
      onOpenChange={props.onOpenChange}
      actionButton={
        <RecommendButton
          documentUri={props.documentUri}
          recommendsCount={props.recommendCount}
          recommendOnly
          large
          className="p-0! border-none! flex-row-reverse! hover:sm:bg-transparent! h-fit! hover:text-accent-contrast!"
        />
      }
      className="px-3!  pb-4 gap-0 sm:w-lg max-w-full relative bg-[var(--color-bg-light)]!"
    >
      <hr className="border-border-light -mx-3 mb-3" />
      <RecommendsList documentUri={props.documentUri} />
    </Modal>
  );
}
