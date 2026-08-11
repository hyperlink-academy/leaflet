"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImageLoadStatus = "loading" | "loaded" | "error";

export function useImageLoadStatus(src: string | undefined) {
  let [status, setStatus] = useState<ImageLoadStatus>("loading");
  let [attempt, setAttempt] = useState(0);
  let ref = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    let img = ref.current;
    // A cached image can settle before the handlers attach
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
    reset: useCallback(() => {
      setStatus("loading");
      setAttempt((a) => a + 1);
    }, []),
  };
}

// `compact` drops the message for small surfaces like gallery thumbnails.
export function ImageErrorState(props: {
  message: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`imageErrorState absolute inset-0 z-10 light-container flex items-center justify-center text-tertiary text-sm ${props.className ?? ""}`}
    >
      <div className="flex flex-wrap gap-1 items-baseline justify-center text-center px-3">
        {!props.compact && <span>{props.message}</span>}
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
