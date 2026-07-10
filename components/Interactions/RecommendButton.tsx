"use client";

import { useContext, useState } from "react";
import useSWR, { mutate } from "swr";
import { create, windowScheduler } from "@yornaath/batshit";
import {
  RecommendEmptyTiny,
  RecommendFilledTiny,
} from "../Icons/RecommendTiny";
import {
  recommendAction,
  unrecommendAction,
} from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/recommendAction";
import { callRPC } from "app/api/rpc/client";
import { useSmoker, useToaster } from "../Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "../OAuthError";
import { useIdentityData } from "../IdentityProvider";
import { LoginModal } from "../LoginButton";
import { Modal } from "../Modal";
import { MobileSheet } from "../MobileSheet";
import { useIsMobile } from "src/hooks/isMobile";
import { RecommendsList } from "./RecommendsList";
import { DrawerThreadContext } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";

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

function useUserRecommendation(documentUri: string) {
  const { data: hasRecommended, isLoading } = useSWR(
    getRecommendationKey(documentUri),
    () => recommendationBatcher.fetch(documentUri),
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

/**
 * Encapsulates the recommendation state and toggle handler so multiple button
 * styles (the tiny inline button and the expanded ButtonSecondary) can share
 * the same optimistic logic. Fetches the user's status asynchronously via SWR
 * with batched requests for efficient fetching when many buttons are rendered.
 */
export function useRecommendPost(documentUri: string, recommendsCount: number) {
  const { hasRecommended, isLoading } = useUserRecommendation(documentUri);
  const { identity } = useIdentityData();
  const [count, setCount] = useState(recommendsCount);
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
    setIsPending(true);
    setOptimisticRecommended(!currentlyRecommended);
    setCount((c) => (currentlyRecommended ? c - 1 : c + 1));

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
      setCount((c) => (currentlyRecommended ? c + 1 : c - 1));
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
  className?: string;
}) {
  const { displayRecommended, count, recommendPost, loginOpen, setLoginOpen } =
    useRecommendPost(props.documentUri, props.recommendsCount);
  const [recommendsModalOpen, setRecommendsModalOpen] = useState(false);
  // Inside a post body (or the post footer) a DrawerThreadContext is in scope;
  // there the recommenders open in the interaction drawer, mirroring how the
  // discussion count does. Elsewhere (listings, feeds) they open in a modal.
  const drawerNav = useContext(DrawerThreadContext);

  return (
    <>
      <div
        className={`recommendButton relative flex gap-1 items-center ${props.className || ""}`}
      >
        <button
          onClick={recommendPost}
          className="flex items-center hover:text-accent-contrast"
          aria-label={displayRecommended ? "Remove recommend" : "Recommend"}
        >
          {displayRecommended ? (
            <RecommendFilledTiny className="text-accent-contrast" />
          ) : (
            <RecommendEmptyTiny />
          )}
        </button>
        {count > 0 && (
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
            className={`hover:text-accent-contrast ${displayRecommended ? "text-accent-contrast" : ""}`}
            aria-label="See who recommended this"
          >
            {count}
          </button>
        )}
      </div>
      {recommendsModalOpen && (
        <RecommendsModal
          documentUri={props.documentUri}
          open={recommendsModalOpen}
          onOpenChange={setRecommendsModalOpen}
        />
      )}
      {loginOpen && (
        <LoginModal noEmailLogin open={loginOpen} onOpenChange={setLoginOpen} />
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
}) {
  const isMobile = useIsMobile();
  const content = (
    <>
      <div className="font-bold text-secondary mb-3">Recommended by</div>
      <RecommendsList documentUri={props.documentUri} />
    </>
  );

  if (isMobile)
    return (
      <MobileSheet open={props.open} onOpenChange={props.onOpenChange}>
        {content}
      </MobileSheet>
    );

  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="w-80! max-w-full"
    >
      {content}
    </Modal>
  );
}
