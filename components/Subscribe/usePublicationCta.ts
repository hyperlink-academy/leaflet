"use client";
import useSWR, { mutate, preload } from "swr";
import { getPublicationCta } from "actions/publications/getPublicationCta";
import type { CtaDefaults } from "src/publicationDefaults";

export const publicationCtaKey = (publicationUri: string) =>
  `publication-cta-${publicationUri}`;

export function usePublicationCta(
  publicationUri: string | undefined,
): CtaDefaults {
  const { data } = useSWR(
    publicationUri ? publicationCtaKey(publicationUri) : null,
    () => getPublicationCta(publicationUri!),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  return data ?? {};
}

// Warms the cache from a subscribe trigger's hover/focus/touch, so the panel
// it opens has the CTA without every button on a list page fetching on mount.
export function preloadPublicationCta(publicationUri: string) {
  preload(publicationCtaKey(publicationUri), () =>
    getPublicationCta(publicationUri),
  );
}

export function setPublicationCtaCache(
  publicationUri: string,
  cta: CtaDefaults,
) {
  return mutate(publicationCtaKey(publicationUri), cta, { revalidate: false });
}
