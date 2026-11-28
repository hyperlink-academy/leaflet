"use client";
import useSWR from "swr";
import { getPublicationCta } from "actions/publications/getPublicationCta";
import type { CtaDefaults } from "src/publicationDefaults";

export const publicationCtaKey = (publicationUri: string) =>
  `publication-cta-${publicationUri}`;

// Pages that load the CTA text on the server seed this key through an
// SWRConfig fallback (PostDataProvider), so their boxes render the custom text
// on the first frame without a refetch.
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
