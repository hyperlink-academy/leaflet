"use client";
import { useEffect, useState } from "react";

// An image that never resolves shouldn't hold speculative work back for the
// rest of the visit.
const SETTLE_TIMEOUT = 5000;

/**
 * Whether the images already on the page have finished — arrived or failed.
 *
 * For holding speculative work (prefetches, preloads) until the page the reader
 * is actually looking at has what it needs: it competes for the same connection
 * at the same priority, so guessing right about where they're going next still
 * costs them the page they're on.
 *
 * The set is taken once per `key`, so images that turn up later — a drawer
 * opening, a list paging in — don't keep pushing the moment further out. Pass
 * the id of whatever the page is showing; a client-side navigation swaps the
 * images without a document load to wait on.
 *
 * Lazy images are left out. One below the fold may not load until it's scrolled
 * to, or ever, and it isn't part of what the reader is waiting for.
 */
export function useImagesSettled(key: string | undefined) {
  let [settled, setSettled] = useState(false);

  useEffect(() => {
    let pending = Array.from(document.images).filter(
      (image) => !image.complete && image.loading !== "lazy",
    );
    if (pending.length === 0) {
      setSettled(true);
      return;
    }
    setSettled(false);

    let remaining = pending.length;
    let done = () => {
      remaining -= 1;
      if (remaining === 0) setSettled(true);
    };
    for (let image of pending) {
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    }
    let timeout = window.setTimeout(() => setSettled(true), SETTLE_TIMEOUT);

    return () => {
      window.clearTimeout(timeout);
      for (let image of pending) {
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
      }
    };
  }, [key]);

  return settled;
}
