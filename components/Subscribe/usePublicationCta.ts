"use client";
import useSWR from "swr";
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
