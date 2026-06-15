"use client";

import { useEffect, useState, useCallback } from "react";
import { create } from "zustand";
import { Transaction } from "prosemirror-state";
import { schema } from "components/Blocks/TextBlock/schema";
import { useEditorStates, setEditorState } from "src/state/useEditorState";
import { useReplicache } from "src/replicache";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { DeleteTiny } from "components/Icons/DeleteTiny";
import { CheckTiny } from "components/Icons/CheckTiny";
import { AnchoredPopover } from "components/AnchoredPopover";
import { ensureProtocol } from "src/utils/ensureProtocol";
import { findMarkRange } from "src/utils/prosemirror/findMarkRange";

type LinkPopoverState = {
  href: string | null;
  anchorElement: HTMLElement | null;
  blockEntityID: string | null;
  open: (href: string, anchor: HTMLElement, blockEntityID: string) => void;
  close: () => void;
};

export const useLinkPopoverStore = create<LinkPopoverState>((set) => ({
  href: null,
  anchorElement: null,
  blockEntityID: null,
  open: (href, anchor, blockEntityID) =>
    set({ href, anchorElement: anchor, blockEntityID }),
  close: () => set({ href: null, anchorElement: null, blockEntityID: null }),
}));

export function LinkPopover() {
  let { href, anchorElement, blockEntityID, close } = useLinkPopoverStore();
  let { undoManager } = useReplicache();
  let [linkValue, setLinkValue] = useState("");

  let isOpen = href !== null && anchorElement !== null;
  let isDirty = href !== null && linkValue !== href;

  useEffect(() => {
    if (href) {
      setLinkValue(href);
    }
  }, [href]);

  let applyLinkTransaction = useCallback(
    (
      buildTr: (tr: Transaction, linkStart: number, linkEnd: number) => void,
    ) => {
      if (!blockEntityID || !anchorElement) return;
      let editorEntry = useEditorStates.getState().editorStates[blockEntityID];
      if (!editorEntry?.editor || !editorEntry.view) return;

      let editor = editorEntry.editor;
      let from = editorEntry.view.posAtDOM(anchorElement, 0);
      let to = editorEntry.view.posAtDOM(
        anchorElement,
        anchorElement.childNodes.length,
      );
      let { start, end } = findMarkRange(
        editor.doc,
        schema.marks.link,
        from,
        to,
      );

      let tr = editor.tr;
      buildTr(tr, start, end);

      let oldState = editor;
      let newState = editor.apply(tr);
      undoManager.add({
        undo: () => setEditorState(blockEntityID, { editor: oldState }),
        redo: () => setEditorState(blockEntityID, { editor: newState }),
      });
      setEditorState(blockEntityID, { editor: newState });
      close();
    },
    [blockEntityID, anchorElement, undoManager, close],
  );

  let saveLink = useCallback(() => {
    applyLinkTransaction((tr, linkStart, linkEnd) => {
      if (linkValue.trim() === "") {
        tr.removeMark(linkStart, linkEnd, schema.marks.link);
      } else {
        let newHref = ensureProtocol(linkValue);
        tr.addMark(
          linkStart,
          linkEnd,
          schema.marks.link.create({ href: newHref }),
        );
      }
    });
  }, [applyLinkTransaction, linkValue]);

  let deleteLink = useCallback(() => {
    applyLinkTransaction((tr, linkStart, linkEnd) => {
      tr.removeMark(linkStart, linkEnd, schema.marks.link);
    });
  }, [applyLinkTransaction]);

  return (
    <AnchoredPopover
      open={isOpen}
      anchorElement={anchorElement}
      onClose={close}
      className="link-popover px-2 py-1"
    >
      <div className="flex items-center gap-1">
        <input
          type="text"
          spellCheck={false}
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveLink();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:text-tertiary"
          placeholder="https://example.com"
        />
        {isDirty ? (
          <button
            className="shrink-0 text-tertiary hover:text-accent-contrast"
            onMouseDown={(e) => {
              e.preventDefault();
              saveLink();
            }}
            title="Save link"
          >
            <CheckTiny />
          </button>
        ) : (
          <div className="flex items-center shrink-0 gap-1">
            <button
              className="text-tertiary hover:text-accent-contrast"
              onMouseDown={(e) => {
                e.preventDefault();
                window.open(
                  ensureProtocol(linkValue),
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              title="Open link"
            >
              <ExternalLinkTiny />
            </button>
            <button
              className="text-tertiary hover:text-accent-contrast"
              onMouseDown={(e) => {
                e.preventDefault();
                deleteLink();
              }}
              title="Remove link"
            >
              <DeleteTiny />
            </button>
          </div>
        )}
      </div>
    </AnchoredPopover>
  );
}
