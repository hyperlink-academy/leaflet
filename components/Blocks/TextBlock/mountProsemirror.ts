import { useLayoutEffect, useRef } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { ySyncPlugin, ySyncPluginKey } from "y-prosemirror";
import { Replicache } from "replicache";
import { produce } from "immer";

import { schema } from "./schema";
import { UndoManager } from "src/undoManager";
import { TextBlockKeymap } from "./keymap";
import { inputrules } from "./inputRules";
import { highlightSelectionPlugin } from "./plugins";
import { autolink } from "./autolink-plugin";
import { useEditorStates } from "src/state/useEditorState";
import {
  useEntity,
  useReplicache,
  type ReplicacheMutators,
} from "src/replicache";
import { useHandlePaste } from "./useHandlePaste";
import { BlockProps } from "../Block";
import { useEntitySetContext } from "components/EntitySetProvider";
import { didToBlueskyUrl, atUriToUrl } from "src/utils/mentionUtils";
import { useFootnotePopoverStore } from "components/Footnotes/FootnotePopover";
import { useLinkPopoverStore } from "components/LinkPopover";
import { useCommentSheetStore } from "components/Comments/commentStores";
import { useCommentPopoverStore } from "components/Comments/CommentPopover";
import { commentDraftPlugin } from "./commentDraftPlugin";
import { stripCommentMarks } from "./stripCommentMarks";
import { useCollabText } from "./useCollabText";

// The comment anchor under an event's target and its comment IDs; null when
// there is none. Anchors can carry several IDs since overlapping comments
// share a mark.
function commentAnchor(event: Event) {
  let anchor = (event.target as HTMLElement | null)?.closest(
    ".comment-anchor[data-comment-id]",
  ) as HTMLElement | null;
  if (!anchor) return null;
  let commentIDs = anchor
    .getAttribute("data-comment-id")!
    .split(" ")
    .filter(Boolean);
  if (commentIDs.length === 0) return null;
  return { anchor, commentIDs };
}

export function useMountProsemirror({
  props,
  openMentionAutocomplete,
}: {
  props: BlockProps;
  openMentionAutocomplete: () => void;
}) {
  let { entityID, parent } = props;
  let rep = useReplicache();
  let mountRef = useRef<HTMLPreElement | null>(null);
  const repRef = useRef<Replicache<ReplicacheMutators> | null>(null);
  let { yText: value, cursorPlugin, overlay } = useCollabText(entityID);
  let entity_set = useEntitySetContext();
  let alignment =
    useEntity(entityID, "block/text-alignment")?.data.value || "left";
  let propsRef = useRef({ ...props, entity_set, alignment });
  let handlePaste = useHandlePaste(entityID, propsRef);

  const actionTimeout = useRef<number | null>(null);

  propsRef.current = { ...props, entity_set, alignment };
  repRef.current = rep.rep;

  useLayoutEffect(() => {
    if (!mountRef.current) return;

    const km = TextBlockKeymap(
      propsRef,
      repRef,
      rep.undoManager,
      openMentionAutocomplete,
    );
    const editor = EditorState.create({
      schema: schema,
      plugins: [
        ySyncPlugin(value),
        cursorPlugin,
        keymap(km),
        inputrules(propsRef, repRef, openMentionAutocomplete),
        keymap(baseKeymap),
        highlightSelectionPlugin,
        commentDraftPlugin,
        autolink({
          type: schema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
      ],
    });

    const view = new EditorView(
      { mount: mountRef.current },
      {
        state: editor,
        handlePaste,
        transformCopied: stripCommentMarks,
        transformPasted: stripCommentMarks,
        handleDOMEvents: {
          // cmd/ctrl+click opens links in a new tab. Handled on the native
          // click event rather than in handleClickOn: popup blockers trust
          // window.open from a click handler, and ProseMirror cancels its
          // click handling when the mouse moves >4px between down and up.
          click: (_view, event) => {
            if (!(event.metaKey || event.ctrlKey)) {
              let target = commentAnchor(event);
              // Read-only viewers don't see comments, so anchors are inert
              if (target && propsRef.current.entity_set.permissions.write) {
                let { anchor, commentIDs } = target;
                let isDesktop = window.matchMedia(
                  "(min-width: 1280px)",
                ).matches;
                if (!isDesktop) {
                  // On mobile, show a popover with an excerpt and a button
                  // that opens the thread in the slide-in sheet
                  let store = useCommentPopoverStore.getState();
                  if (store.commentIDs?.join(" ") === commentIDs.join(" ")) {
                    store.close();
                  } else {
                    store.open(commentIDs, anchor);
                  }
                  event.preventDefault();
                  return true;
                }
                // On desktop canvas pages there's no side column, so open the
                // sheet directly; on doc pages the side column thread expands
                // on hover, so the click just places the cursor.
                if (propsRef.current.pageType === "canvas") {
                  useCommentSheetStore
                    .getState()
                    .openSheet(propsRef.current.parent, commentIDs[0]);
                  event.preventDefault();
                  return true;
                }
                return false;
              }
              return false;
            }
            let anchor = (event.target as HTMLElement | null)?.closest("a");
            let href = anchor?.getAttribute("href");
            if (!href) return false;
            window.open(href, "_blank", "noopener,noreferrer");
            event.preventDefault();
            return true;
          },
        },
        handleClickOn: (_view, _pos, node, _nodePos, _event, direct) => {
          if (!direct) return;

          // Check for footnote inline nodes
          if (node?.type === schema.nodes.footnote) {
            let footnoteID = node.attrs.footnoteEntityID;
            let supEl = _event.target as HTMLElement;
            let sup = supEl.closest(".footnote-ref") as HTMLElement | null;
            if (!sup) return;

            // On mobile/tablet or canvas, show popover
            let isDesktop = window.matchMedia("(min-width: 1280px)").matches;
            let isCanvas = propsRef.current.pageType === "canvas";
            if (!isDesktop || isCanvas) {
              let store = useFootnotePopoverStore.getState();
              if (store.activeFootnoteID === footnoteID) {
                store.close();
              } else {
                store.open(footnoteID, sup);
              }
              return;
            }

            // On desktop, prefer the side column editor if visible
            let sideColumn = document.querySelector(".footnote-side-column");
            let editor = sideColumn?.querySelector(
              `[data-footnote-editor="${footnoteID}"]`,
            ) as HTMLElement | null;
            // Fall back to the bottom section
            if (!editor) {
              editor = document.querySelector(
                `[data-footnote-editor="${footnoteID}"]`,
              ) as HTMLElement | null;
            }
            if (editor) {
              editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
              let pm = editor.querySelector(
                ".ProseMirror",
              ) as HTMLElement | null;
              if (pm) {
                setTimeout(() => pm!.focus(), 100);
              }
            }
            return;
          }

          // Check for didMention inline nodes
          if (node?.type === schema.nodes.didMention) {
            window.open(
              didToBlueskyUrl(node.attrs.did),
              "_blank",
              "noopener,noreferrer",
            );
            return;
          }

          // Check for atMention inline nodes
          if (node?.type === schema.nodes.atMention) {
            if (node.attrs.href)
              window.open(node.attrs.href, "_blank", "noopener,noreferrer");
            else {
              const url = atUriToUrl(node.attrs.atURI);
              window.open(url, "_blank", "noopener,noreferrer");
            }
            return;
          }

          if (node.nodeSize - 2 <= _pos) return;
          const nodeAt1 = node.nodeAt(_pos - 1);
          const nodeAt2 = node.nodeAt(Math.max(_pos - 2, 0));
          let linkMark =
            nodeAt1?.marks.find((f) => f.type === schema.marks.link) ||
            nodeAt2?.marks.find((f) => f.type === schema.marks.link);
          if (linkMark) {
            // cmd/ctrl+click opens in a new tab via the click DOM handler
            // above — don't open the edit popover or let ProseMirror treat
            // it as a select-node click.
            if (_event.metaKey || _event.ctrlKey) return true;
            let anchor = (_event.target as HTMLElement).closest(
              "a",
            ) as HTMLElement | null;
            if (anchor) {
              useLinkPopoverStore
                .getState()
                .open(linkMark.attrs.href, anchor, entityID);
            }
            return;
          }
        },
        dispatchTransaction,
      },
    );

    const unsubscribe = useEditorStates.subscribe(
      (s) => s.editorStates[entityID],
      (editorState) => {
        if (editorState?.initial) return;
        if (editorState?.editor)
          editorState.view?.updateState(editorState.editor);
      },
    );

    let editorState = useEditorStates.getState().editorStates[entityID];
    if (editorState?.editor && !editorState.initial)
      editorState.view?.updateState(editorState.editor);

    return () => {
      unsubscribe();
      view.destroy();
      useEditorStates.setState((s) => ({
        ...s,
        editorStates: {
          ...s.editorStates,
          [entityID]: undefined,
        },
      }));
    };

    function dispatchTransaction(this: EditorView, tr: any) {
      useEditorStates.setState((s) => {
        let oldEditorState = this.state;
        let newState = this.state.apply(tr);
        let docHasChanges = tr.steps.length !== 0 || tr.docChanged;
        // Changes synced in from a peer over yjs carry the ySync change origin.
        // The peer that made the edit already fired the orphan-diff mutations
        // below, so skip them here to avoid deleting the same footnote/comment
        // twice from every client.
        let isRemoteChange = !!tr.getMeta(ySyncPluginKey)?.isChangeOrigin;

        // Diff for removed/added footnote nodes
        if (docHasChanges && !isRemoteChange) {
          let oldFootnotes = new Set<string>();
          let newFootnotes = new Set<string>();
          oldEditorState.doc.descendants((n) => {
            if (n.type.name === "footnote")
              oldFootnotes.add(n.attrs.footnoteEntityID);
          });
          newState.doc.descendants((n) => {
            if (n.type.name === "footnote")
              newFootnotes.add(n.attrs.footnoteEntityID);
          });
          // Removed footnotes
          for (let id of oldFootnotes) {
            if (!newFootnotes.has(id)) {
              repRef.current?.mutate.deleteFootnote({
                footnoteEntityID: id,
                blockID: entityID,
              });
            }
          }

          // Diff comment marks: deleting all the commented text deletes the
          // comment, like removing a footnote node deletes the footnote
          let collectCommentIDs = (doc: Node, into: Set<string>) => {
            doc.descendants((n) => {
              for (let m of n.marks)
                if (m.type.name === "comment")
                  for (let id of ((m.attrs.commentID as string) || "").split(
                    " ",
                  )) {
                    if (id) into.add(id);
                  }
            });
          };
          let oldComments = new Set<string>();
          let newComments = new Set<string>();
          collectCommentIDs(oldEditorState.doc, oldComments);
          collectCommentIDs(newState.doc, newComments);
          // Resolving a thread strips its anchor mark locally, so this also
          // fires for a just-resolved comment on the resolver's own client;
          // deleteComment is idempotent, so the redundant delete is harmless.
          for (let id of oldComments) {
            if (!newComments.has(id)) {
              repRef.current?.mutate.deleteComment({
                commentEntityID: id,
                blockID: entityID,
              });
            }
          }
        }

        // Handle undo/redo history with timeout-based grouping
        let isBulkOp = tr.getMeta("bulkOp");
        let setState = (s: EditorState) => () =>
          useEditorStates.setState(
            produce((draft) => {
              let view = draft.editorStates[entityID]?.view;
              if (!view?.hasFocus() && !isBulkOp) view?.focus();
              draft.editorStates[entityID]!.editor = s;
            }),
          );

        trackUndoRedo(
          tr,
          rep.undoManager,
          actionTimeout,
          setState(oldEditorState),
          setState(newState),
        );

        return {
          editorStates: {
            ...s.editorStates,
            [entityID]: {
              editor: newState,
              view: this as unknown as EditorView,
              initial: false,
              keymap: km,
            },
          },
        };
      });
    }
  }, [entityID, parent, value, cursorPlugin, handlePaste, rep]);
  return { mountRef, actionTimeout, overlay };
}

export function trackUndoRedo(
  tr: Transaction,
  undoManager: UndoManager,
  actionTimeout: { current: number | null },
  undo: () => void,
  redo: () => void,
) {
  let addToHistory = tr.getMeta("addToHistory");
  let isBulkOp = tr.getMeta("bulkOp");
  let docHasChanges = tr.steps.length !== 0 || tr.docChanged;

  if (addToHistory !== false && docHasChanges) {
    if (actionTimeout.current) window.clearTimeout(actionTimeout.current);
    else if (!isBulkOp) undoManager.startGroup();

    if (!isBulkOp) {
      actionTimeout.current = window.setTimeout(() => {
        undoManager.endGroup();
        actionTimeout.current = null;
      }, 200);
    }

    undoManager.add({ undo, redo });
  }
}
