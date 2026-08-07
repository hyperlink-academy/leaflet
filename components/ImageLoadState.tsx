"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImageLoadStatus = "loading" | "loaded" | "error";

/**
 * Tracks whether an `<img>` has arrived, so a broken one can offer a way out.
 */
export function useImageLoadStatus(src: string | undefined) {
  let [status, setStatus] = useState<ImageLoadStatus>("loading");
  // Bumped by `reset`, so a retry re-reads the element rather than keeping the
  // verdict from the attempt before it.
  let [attempt, setAttempt] = useState(0);
  let ref = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    let img = ref.current;
    // `complete` with no intrinsic width is how a failure that happened before
    // this ran reads — there is no error event left to catch.
    if (img?.complete) setStatus(img.naturalWidth > 0 ? "loaded" : "error");
    else setStatus("loading");
  }, [src, attempt]);

  return {
    status,
    imgProps: {
      ref,
      onLoad: useCallback(() => setStatus("loaded"), []),
      onError: useCallback(() => setStatus("error"), []),
    },
    // For a retry that's about to re-request the image.
    reset: useCallback(() => {
      setStatus("loading");
      setAttempt((a) => a + 1);
    }, []),
  };
}

/**
 * The frame an image that isn't coming leaves behind, with a way to ask for it
 * again.
 *
 * Absolutely positioned, so it needs a `relative` parent sized by the image
 * itself (its width/height attributes reserve the box before it loads).
 */
export function ImageErrorState(props: {
  message: string;
  actionLabel: string;
  onAction: () => void;
  className?: string;
}) {
  return (
    <div
      className={`imageErrorState absolute inset-0 light-container flex items-center justify-center text-tertiary text-sm ${props.className ?? ""}`}
    >
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
    </div>
  );
}
