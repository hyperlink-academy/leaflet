import { create } from "zustand";

type FootnotePopoverState = {
  activeFootnoteID: string | null;
  anchorElement: HTMLElement | null;
  pageID: string | null;
  open: (footnoteID: string, anchor: HTMLElement, pageID?: string) => void;
  close: () => void;
};

// Separate from FootnotePopover so read-only text rendering can open the
// popover without pulling in the footnote editor's prosemirror stack.
export const useFootnotePopoverStore = create<FootnotePopoverState>((set) => ({
  activeFootnoteID: null,
  anchorElement: null,
  pageID: null,
  open: (footnoteID, anchor, pageID) =>
    set({
      activeFootnoteID: footnoteID,
      anchorElement: anchor,
      pageID: pageID ?? null,
    }),
  close: () =>
    set({ activeFootnoteID: null, anchorElement: null, pageID: null }),
}));
