"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { create, windowScheduler } from "@yornaath/batshit";
import { RecommendTinyEmpty, RecommendTinyFilled } from "./Icons/RecommendTiny";
import {
  recommendAction,
  unrecommendAction,
} from "app/lish/[did]/[publication]/[rkey]/Interactions/recommendAction";
import { callRPC } from "app/api/rpc/client";
import { useSmoker, useToaster } from "./Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "./OAuthError";
import { ButtonSecondary } from "./Buttons";
import { Separator } from "./Layout";

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
 * RecommendButton that fetches the user's recommendation status asynchronously.
 * Uses SWR with batched requests for efficient fetching when many buttons are rendered.
 */
export function RecommendButton(props: {
  documentUri: string;
  recommendsCount: number;
  className?: string;
  expanded?: boolean;
}) {
  const { hasRecommended, isLoading } = useUserRecommendation(
    props.documentUri,
  );
  const [count, setCount] = useState(props.recommendsCount);
  const [isPending, setIsPending] = useState(false);
  const [optimisticRecommended, setOptimisticRecommended] = useState<
    boolean | null
  >(null);
  const toaster = useToaster();
  const smoker = useSmoker();

  // Use optimistic state if set, otherwise use fetched state
  const displayRecommended =
    optimisticRecommended !== null ? optimisticRecommended : hasRecommended;

  const handleClick = async (e: React.MouseEvent) => {
    if (isPending || isLoading) return;

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
      ? await unrecommendAction({ document: props.documentUri })
      : await recommendAction({ document: props.documentUri });
    if (!result.success) {
      // Revert optimistic update
      setOptimisticRecommended(null);
      setCount((c) => (currentlyRecommended ? c + 1 : c - 1));
      setIsPending(false);

      toaster({
        content: isOAuthSessionError(result.error) ? (
          <OAuthErrorMessage error={result.error} />
        ) : (
          "oh no! error!"
        ),
        type: "error",
      });
      return;
    }

    // Update the SWR cache to match the new state
    mutateRecommendation(props.documentUri, !currentlyRecommended);
    setOptimisticRecommended(null);
    setIsPending(false);
  };

  if (props.expanded)
    return (
      <ButtonSecondary
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClick(e);
        }}
      >
        {displayRecommended ? (
          <RecommendTinyFilled className="text-accent-contrast" />
        ) : (
          <RecommendTinyEmpty />
        )}
        <div className="flex gap-2 items-center">
          {count > 0 && (
            <>
              <span
                className={`${displayRecommended && "text-accent-contrast"}`}
              >
                {count}
              </span>
              <Separator classname="h-4! text-accent-contrast!" />
            </>
          )}
          {displayRecommended ? "Recommended!" : "Recommend"}
        </div>
      </ButtonSecondary>
    );

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick(e);
      }}
      disabled={isPending || isLoading}
      className={`recommendButton relative flex gap-1  items-center hover:text-accent-contrast ${props.className || ""}`}
      aria-label={displayRecommended ? "Remove recommend" : "Recommend"}
    >
      {displayRecommended ? (
        <RecommendTinyFilled className="text-accent-contrast" />
      ) : (
        <RecommendTinyEmpty />
      )}
      {count > 0 && (
        <span className={`${displayRecommended && "text-accent-contrast"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
