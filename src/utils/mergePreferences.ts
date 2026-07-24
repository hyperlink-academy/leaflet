export type PrevNextDirection = "ltr" | "rtl";

/** Which way along the prev/next row posts get newer. */
export function resolvePrevNextDirection(
  direction: string | undefined,
): PrevNextDirection {
  return direction === "ltr" ? "ltr" : "rtl";
}

type PreferencesInput = {
  showComments?: boolean;
  showMentions?: boolean;
  showRecommends?: boolean;
  showPrevNext?: boolean;
  showFirstLast?: boolean;
  prevNextDirection?: string;
} | null;

export function mergePreferences(
  documentPrefs?: PreferencesInput,
  publicationPrefs?: PreferencesInput,
): {
  showComments?: boolean;
  showMentions?: boolean;
  showRecommends?: boolean;
  showPrevNext?: boolean;
  showFirstLast?: boolean;
  prevNextDirection?: string;
} {
  return {
    showComments: documentPrefs?.showComments ?? publicationPrefs?.showComments,
    showMentions: documentPrefs?.showMentions ?? publicationPrefs?.showMentions,
    showRecommends:
      documentPrefs?.showRecommends ?? publicationPrefs?.showRecommends,
    showPrevNext: publicationPrefs?.showPrevNext,
    showFirstLast: publicationPrefs?.showFirstLast,
    prevNextDirection: publicationPrefs?.prevNextDirection,
  };
}
