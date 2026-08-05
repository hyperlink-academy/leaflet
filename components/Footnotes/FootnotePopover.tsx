"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { useFootnoteContext } from "./FootnoteContext";
import { FootnoteEditor } from "./FootnoteEditor";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { AnchoredPopover } from "components/AnchoredPopover";
import { deleteFootnoteFromBlock } from "./deleteFootnoteFromBlock";

type FootnotePopoverState = {
  activeFootnoteID: string | null;
  anchorElement: HTMLElement | null;
  pageID: string | null;
  open: (footnoteID: string, anchor: HTMLElement, pageID?: string) => void;
  close: () => void;
};

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

export function FootnotePopover(props: { pageID: string }) {
  let { activeFootnoteID, anchorElement, pageID, close } =
    useFootnotePopoverStore();
  let { footnotes } = useFootnoteContext();
  let { permissions } = useEntitySetContext();
  let rep = useReplicache();

  let footnote = footnotes.find(
    (fn) => fn.footnoteEntityID === activeFootnoteID,
  );

  // Compute the displayed index from DOM order (matching CSS counters)
  // rather than the data model order, which may differ if footnotes
  // were inserted out of order within a block.
  let displayIndex = useMemo(() => {
    if (!anchorElement || !footnote) return footnote?.index ?? 0;
    let container = anchorElement.closest(".footnote-scope");
    if (!container) return footnote.index;
    let allRefs = Array.from(
      container.querySelectorAll(".footnote-ref"),
    ).filter((ref) => !ref.closest(".pageLinkBlockWrapper"));
    let pos = allRefs.indexOf(anchorElement);
    return pos >= 0 ? pos + 1 : footnote.index;
  }, [anchorElement, footnote]);

  return (
    <AnchoredPopover
      open={!!activeFootnoteID && !!footnote && pageID === props.pageID}
      anchorElement={anchorElement}
      onClose={close}
      className="footnote-popover px-3 py-2"
    >
      {footnote && (
        <FootnoteEditor
          footnoteEntityID={footnote.footnoteEntityID}
          index={displayIndex}
          editable={permissions.write}
          autoFocus={permissions.write}
          onDelete={
            permissions.write
              ? () => {
                  deleteFootnoteFromBlock(
                    footnote.footnoteEntityID,
                    footnote.blockID,
                    rep.rep,
                  );
                  close();
                }
              : undefined
          }
        />
      )}
    </AnchoredPopover>
  );
}
