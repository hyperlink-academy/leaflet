import { create } from "zustand";

// One comment draft at a time. The anchor range lives in the block editor's
// commentDraftPlugin decoration (so it maps through edits); this store only
// tracks which block/page is being commented on.
export const useEditorCommentDraftStore = create<{
  draft: { blockID: string; pageID: string } | null;
}>(() => ({
  draft: null,
}));

// In-progress reply drafts, keyed by the thread's top-level comment entity ID.
// A half-written reply is saved here when its thread unmounts (the mobile sheet
// closing, the side column hiding) so reopening restores it; it's cleared only
// when the reply is submitted or canceled. Pass null to clear an entry.
export const useEditorCommentReplyDraftStore = create<{
  drafts: Record<string, string>;
  setDraft: (commentEntityID: string, content: string | null) => void;
}>((set) => ({
  drafts: {},
  setDraft: (commentEntityID, content) =>
    set((s) => {
      if (content === null) {
        if (!(commentEntityID in s.drafts)) return s;
        let { [commentEntityID]: _removed, ...rest } = s.drafts;
        return { drafts: rest };
      }
      return { drafts: { ...s.drafts, [commentEntityID]: content } };
    }),
}));

// Two-way hover pairing: hovering a comment anchor in the text highlights its
// thread in the side column with a border, and vice versa. An anchor can carry
// several IDs where comments overlap, so this holds a set — an anchor or thread
// is highlighted when its ID is present.
export const useHoveredEditorCommentStore = create<{
  hoveredCommentIDs: string[];
}>(() => ({
  hoveredCommentIDs: [],
}));

// Mobile/canvas slide-in panel state. Scoped to a page since the sheet
// renders once per open page. focusedCommentID scrolls the panel to that
// thread when it opens.
export const useEditorCommentSheetStore = create<{
  pageID: string | null;
  focusedCommentID: string | null;
  openSheet: (pageID: string, commentID?: string | null) => void;
  close: () => void;
}>((set) => ({
  pageID: null,
  focusedCommentID: null,
  openSheet: (pageID, commentID) =>
    set({ pageID, focusedCommentID: commentID ?? null }),
  close: () => set({ pageID: null, focusedCommentID: null }),
}));
