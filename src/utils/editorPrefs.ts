import { isPageLinkDisplay, type PageLinkDisplay } from "./pageLinkDisplay";

// Per-browser editor preferences: settings the user last chose that should
// seed the next thing they create. One localStorage object so new prefs don't
// each need their own key.
const STORAGE_KEY = "leafletEditorPrefs-v1";

export type EditorPrefs = {
  pageLinkDisplay?: PageLinkDisplay;
};

export function getEditorPrefs(): EditorPrefs {
  try {
    let parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      pageLinkDisplay: isPageLinkDisplay(parsed?.pageLinkDisplay)
        ? parsed.pageLinkDisplay
        : undefined,
    };
  } catch {
    return {};
  }
}

export function setEditorPref<K extends keyof EditorPrefs>(
  key: K,
  value: EditorPrefs[K],
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...getEditorPrefs(), [key]: value }),
    );
  } catch {}
}
