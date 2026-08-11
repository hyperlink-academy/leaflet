"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AtUri } from "@atproto/api";
import { useDocument } from "contexts/DocumentContext";
import { getPublicationURL } from "src/utils/getPublicationURL";

// An image that never resolves shouldn't hold speculative work back forever
const SETTLE_TIMEOUT = 5000;

/**
 * Warm the posts the reader can page to: prefetch the routes one hop each way
 * plus one further out (so a run of page turns never stops to fetch), and
 * fetch the neighbours' opening images so a page turn doesn't land on empty
 * frames.
 *
 * Nothing starts until the images on the current post have settled —
 * speculative fetches share the connection, at the same low priority, with the
 * page the reader is actually on. Failures are ignored throughout: a route
 * that isn't warmed navigates cold, and an image that fails here loads
 * normally when the reader reaches it.
 */
export function useWarmAdjacentPosts(enabled: boolean) {
  const { prevNext, publication, uri } = useDocument();
  const router = useRouter();
  const settled = useImagesSettled(uri);

  useEffect(() => {
    if (!settled || !enabled || !publication || !prevNext) return;

    const base = getPublicationURL(publication);
    for (const target of [
      prevNext.next?.uri,
      prevNext.prev?.uri,
      prevNext.nextPreload,
      prevNext.prevPreload,
    ]) {
      if (!target) continue;
      const href = `${base}/${new AtUri(target).rkey}`;
      // A publication on its own domain is a different origin — nothing the
      // router can warm.
      try {
        if (
          new URL(href, window.location.href).origin !==
          window.location.origin
        )
          continue;
      } catch {
        continue;
      }
      router.prefetch(href);
    }

    // Forward first — readers usually keep going. Detached Image objects land
    // the bytes in the HTTP cache the real <img> will hit without touching the
    // DOM. Only each post's opening image is decoded: a decoded bitmap stays
    // resident for as long as its Image does, and cached bytes are all a
    // scroll needs.
    const images = [prevNext.next, prevNext.prev].flatMap(
      (post) =>
        post?.images?.map((src, index) => {
          const image = new Image();
          image.decoding = "async";
          image.fetchPriority = "low";
          image.src = src;
          if (index === 0) void image.decode?.().catch(() => {});
          return image;
        }) ?? [],
    );

    return () => {
      // Lets the browser abandon fetches the reader has moved past
      for (const image of images) if (!image.complete) image.src = "";
    };
  }, [settled, enabled, publication, prevNext, router]);
}

/**
 * Whether the images on the page have arrived or failed. The set is sampled
 * once per `key`, so images that turn up later don't keep pushing the moment
 * out; lazy images are left out for the same reason.
 */
function useImagesSettled(key: string | undefined) {
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
