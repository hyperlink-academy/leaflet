import { create } from "zustand";

// One comment draft at a time. The anchor range lives in the block editor's
// commentDraftPlugin decoration (so it maps through edits); this store only
// tracks which block/page is being commented on.
export const useCommentDraftStore = create<{
  draft: { blockID: string; pageID: string } | null;
}>(() => ({
  draft: null,
}));

// Two-way hover pairing: hovering a comment anchor in the text highlights its
// thread in the side column with a border, and vice versa. An anchor can carry
// several IDs where comments overlap, so this holds a set — an anchor or thread
// is highlighted when its ID is present.
export const useHoveredCommentStore = create<{
  hoveredCommentIDs: string[];
}>(() => ({
  hoveredCommentIDs: [],
}));

// Mobile/canvas slide-in panel state. Scoped to a page since the sheet
// renders once per open page. focusedCommentID scrolls the panel to that
// thread when it opens.
export const useCommentSheetStore = create<{
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
