type PreferencesInput = {
  showComments?: boolean;
  showMentions?: boolean;
  showRecommends?: boolean;
  showPrevNext?: boolean;
} | null;

export function mergePreferences(
  documentPrefs?: PreferencesInput,
  publicationPrefs?: PreferencesInput,
): {
  showComments?: boolean;
  showMentions?: boolean;
  showRecommends?: boolean;
  showPrevNext?: boolean;
} {
  return {
    showComments: documentPrefs?.showComments ?? publicationPrefs?.showComments,
    showMentions: documentPrefs?.showMentions ?? publicationPrefs?.showMentions,
    showRecommends:
      documentPrefs?.showRecommends ?? publicationPrefs?.showRecommends,
    showPrevNext: publicationPrefs?.showPrevNext,
  };
}
