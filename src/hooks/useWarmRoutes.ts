"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Prefetch a handful of routes into the router cache, so opening one of them is
 * instant.
 *
 * Publication URLs are absolute and a publication on its own domain is a

 * different origin — nothing the router can warm — so those are skipped rather
 * than turned into a request against the wrong host.
 */
export function useWarmRoutes() {
  const router = useRouter();
  return useCallback(
    (hrefs: Array<string | undefined>) => {
      for (const href of hrefs) {
        if (!href) continue;
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) continue;
        } catch {
          continue;
        }
        router.prefetch(href);
      }
    },
    [router],
  );
}
