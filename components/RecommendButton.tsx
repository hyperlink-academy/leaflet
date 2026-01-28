"use client";

import { useState } from "react";
import { RecommendTinyEmpty, RecommendTinyFilled } from "./Icons/RecommendTiny";
import {
  recommendAction,
  unrecommendAction,
} from "app/lish/[did]/[publication]/[rkey]/Interactions/recommendAction";

export function RecommendButton(props: {
  documentUri: string;
  recommendsCount: number;
  hasRecommended: boolean;
  className?: string;
  showCount?: boolean;
}) {
  const [hasRecommended, setHasRecommended] = useState(props.hasRecommended);
  const [count, setCount] = useState(props.recommendsCount);
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;

    const currentlyRecommended = hasRecommended;
    setIsPending(true);
    setHasRecommended(!currentlyRecommended);
    setCount((c) => (currentlyRecommended ? c - 1 : c + 1));

    try {
      if (currentlyRecommended) {
        await unrecommendAction({ document: props.documentUri });
      } else {
        await recommendAction({ document: props.documentUri });
      }
    } catch (error) {
      // Revert on error
      setHasRecommended(currentlyRecommended);
      setCount((c) => (currentlyRecommended ? c + 1 : c - 1));
    } finally {
      setIsPending(false);
    }
  };

  const showCount = props.showCount !== false;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
      disabled={isPending}
      className={`recommendButton flex gap-1  items-center hover:text-accent-contrast ${props.className || ""}`}
      aria-label={hasRecommended ? "Remove recommend" : "Recommend"}
    >
      {hasRecommended ? (
        <RecommendTinyFilled className="text-accent-contrast" />
      ) : (
        <RecommendTinyEmpty />
      )}
      {showCount && count > 0 && (
        <span className={`${hasRecommended && "text-accent-contrast"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
