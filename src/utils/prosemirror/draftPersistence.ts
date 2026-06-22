// Persist an in-progress ProseMirror draft to localStorage so it survives a
// page reload. The draft is stored as the document's JSON, keyed per context
// (the post being commented on, the document being published, …) so two
// composers never share a draft. Pass a null key to disable persistence, and
// clear the entry once the draft is submitted.
const PREFIX = "pmDraft-v1:";

export function loadDraftDoc(key: string | null | undefined): unknown | null {
  if (!key || typeof window === "undefined") return null;
  try {
    let raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraftDoc(key: string | null | undefined, docJSON: unknown | null) {
  if (!key || typeof window === "undefined") return;
  try {
    if (docJSON == null) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, JSON.stringify(docJSON));
  } catch {}
}

export function clearDraftDoc(key: string | null | undefined) {
  saveDraftDoc(key, null);
}
