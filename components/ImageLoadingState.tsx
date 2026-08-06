"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingTiny } from "components/Icons/LoadingTiny";

// How long an image gets to arrive before it counts as broken. Long enough for
// a big photo on a slow connection, short enough that nobody is left watching a
// spinner that's never going to stop.
const IMAGE_LOAD_TIMEOUT = 15000;

export type ImageLoadStatus = "loading" | "loaded" | "error";

/**
 * Tracks whether an `<img>` has actually arrived.
 *
 * Spread `imgProps` onto the image. The ref is what covers the case React can't
 * see: an image already in the browser cache can finish before the onLoad
 * handler is attached, which would otherwise leave the spinner up for good.
 */
export function useImageLoadStatus(src: string | undefined) {
  let [status, setStatus] = useState<ImageLoadStatus>("loading");
  // Bumped by `reset`, so a retry that re-requests the same src still gets a
  // fresh clock rather than inheriting the one that already ran out.
  let [attempt, setAttempt] = useState(0);
  let ref = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    let img = ref.current;
    if (img?.complete && img.naturalWidth > 0) {
      setStatus("loaded");
      return;
    }
    setStatus("loading");

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let arm = () => {
      timeout ??= setTimeout(
        () => setStatus((s) => (s === "loading" ? "error" : s)),
        IMAGE_LOAD_TIMEOUT,
      );
    };

    // A lazy image below the fold hasn't started fetching, so a clock started
    // now would be counting time it was never going to spend loading. Wait
    // until it's on screen and the request is actually out.
    if (!img || typeof IntersectionObserver === "undefined") {
      arm();
      return () => clearTimeout(timeout);
    }
    let observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      arm();
    });
    observer.observe(img);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [src, attempt]);

  return {
    status,
    imgProps: {
      ref,
      onLoad: useCallback(() => setStatus("loaded"), []),
      onError: useCallback(() => setStatus("error"), []),
    },
    // Back to the spinner, for a retry that's about to re-request the image.
    reset: useCallback(() => {
      setStatus("loading");
      setAttempt((a) => a + 1);
    }, []),
  };
}

/**
 * The frame an image sits behind until it's there: a light container with a
 * spinner, and — once it's clear the image isn't coming — a way to ask for it
 * again.
 *
 * Absolutely positioned, so it needs a `relative` parent sized by the image
 * itself (its width/height attributes reserve the box before it loads).
 */
export function ImageLoadingState(props: {
  status: "loading" | "error";
  message: string;
  actionLabel: string;
  onAction: () => void;
  className?: string;
}) {
  return (
    <div
      className={`imageLoadingState absolute inset-0 light-container flex items-center justify-center text-tertiary text-sm ${props.className ?? ""}`}
    >
      {props.status === "loading" ? (
        <LoadingTiny className="animate-spin shrink-0" />
      ) : (
        <div className="flex flex-wrap gap-1 items-baseline justify-center text-center px-3">
          <span>{props.message}</span>
          <button
            type="button"
            className="text-accent-contrast font-bold hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              props.onAction();
            }}
          >
            {props.actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
