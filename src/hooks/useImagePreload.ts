"use client";
import { useEffect } from "react";

export type PreloadTarget = {
  src: string;
  // Decode as well as fetch, so the bitmap is ready rather than merely
  // downloaded — a large image can otherwise still flash on first paint. Worth
  // it for what lands above the fold, not for what's waiting further down: a
  // decoded bitmap stays resident for as long as its Image does, and cached
  // bytes are all a scroll needs.
  decode?: boolean;
};

/**
 * Warm images the reader is about to need.
 *
 * Uses detached `Image` objects rather than hidden `<img>` elements: the bytes
 * land in the same HTTP cache the real `<img>` will hit, but nothing joins the
 * DOM, so there's no layout, no paint, and nothing for a screen reader to walk
 * through.
 *
 * Failures are ignored — this is an optimisation, and an image that fails here
 * loads normally, error frame and all, when the reader reaches it.
 */
export function useImagePreload(targets: PreloadTarget[]) {
  // The targets themselves are the real dependency: a re-render that produces
  // an equal list must not restart fetches that are already in flight.
  const key = JSON.stringify(targets);

  useEffect(() => {
    if (typeof Image === "undefined") return;
    const parsed: PreloadTarget[] = JSON.parse(key);
    if (parsed.length === 0) return;

    const images = parsed.map((target) => {
      const image = new Image();
      image.decoding = "async";
      // Speculative, so never at the expense of the page the reader is on.
      image.fetchPriority = "low";
      image.src = target.src;
      // decode() rejects when the element is discarded mid-flight, which is
      // exactly what paging away does — not an error.
      if (target.decode) void image.decode?.().catch(() => {});
      return image;
    });

    return () => {
      // Dropping src lets the browser abandon a fetch the reader has moved past;
      // anything already in the HTTP cache stays there.
      for (const image of images) if (!image.complete) image.src = "";
    };
  }, [key]);
}
