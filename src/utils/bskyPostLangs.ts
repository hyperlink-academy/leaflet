// Posts with no `langs` field get language-detected client-side by bsky.app
// (a small n-gram model over the text), which routinely misclassifies short
// posts and then hides them from custom feeds via the viewer's
// content-language filter. Stamp the viewer's browser language, the same
// source the official composer uses for its default post language.
export function viewerPostLangs(): string[] {
  if (typeof navigator === "undefined" || !navigator.language) return ["en"];
  return [navigator.language];
}
