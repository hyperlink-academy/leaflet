"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { create, windowScheduler } from "@yornaath/batshit";
import { RecommendEmptyTiny, RecommendFilledTiny } from "./Icons/RecommendTiny";
import {
  recommendAction,
  unrecommendAction,
} from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/recommendAction";
import { callRPC } from "app/api/rpc/client";
import { useSmoker, useToaster } from "./Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "./OAuthError";
import { useIdentityData } from "./IdentityProvider";
import { LoginModal } from "./LoginButton";

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

  return (
    <>
      <button
        onClick={recommendPost}
        className={`recommendButton relative flex gap-1  items-center hover:text-accent-contrast ${props.className || ""}`}
        aria-label={displayRecommended ? "Remove recommend" : "Recommend"}
      >
        {displayRecommended ? (
          <RecommendFilledTiny className="text-accent-contrast" />
        ) : (
          <RecommendEmptyTiny />
        )}
        {count > 0 && (
          <span className={`${displayRecommended && "text-accent-contrast"}`}>
            {count}
          </span>
        )}
      </button>
      {loginOpen && (
        <LoginModal noEmailLogin open={loginOpen} onOpenChange={setLoginOpen} />
      )}
    </>
  );
}
