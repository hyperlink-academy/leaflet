"use client";

import { useLayoutEffect, useRef } from "react";
import { EditorState, TextSelection } from "prosemirror-state";
import { Slice } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { ySyncPlugin, ySyncPluginKey } from "y-prosemirror";
import { UndoManager as YUndoManager, encodeStateAsUpdate } from "yjs";
import { fromByteArray } from "base64-js";
import { useReplicache } from "src/replicache";
import { useEditorStates } from "src/state/useEditorState";
import { formattingKeymap } from "src/utils/prosemirror/formattingKeymap";
import { useUIState } from "src/useUIState";
import {
  stripCommentMarks,
  stripFootnoteRefs,
} from "../TextBlock/stripCommentMarks";
import {
  parseTableClipboard,
  tableCellDocument,
  type TableGrid,
} from "src/utils/paste/tableClipboard";
import { autolink } from "../TextBlock/autolink-plugin";
import { schema } from "../TextBlock/schema";
import {
  useStaleClient,
  stampDocSchemaVersion,
} from "../TextBlock/schemaVersion";
import { useCollabText } from "../TextBlock/useCollabText";

export type Navigation =
  | "Tab"
  | "Shift-Tab"
  | "Enter"
  | "Escape"
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown";

export function TableCellEditor(props: {
  cell: string;
  table?: string;
  caret?: "start" | "end";
  generation: string;
  value?: string | null;
  label: string;
  onNavigate: (direction: Navigation) => boolean;
  onPaste: (grid: TableGrid | "too-large") => void;
  editorRef: React.RefObject<EditorView | null>;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const { rep, undoManager } = useReplicache();
  const { yText, cursorPlugin, overlay, syncID } = useCollabText(props.cell, {
    generation: props.generation,
    value: props.value,
  });
  useLayoutEffect(() => {
    if (!mount.current) return;
    const history = new YUndoManager(yText, {
      trackedOrigins: new Set([ySyncPluginKey]),
      captureTimeout: 0,
    });
    const persist = async () => {
      if (useStaleClient.getState().stale) return;
      const doc = yText.doc!;
      stampDocSchemaVersion(doc);
      await rep?.mutate.editTableCellText({
        cell: props.cell,
        generation: props.generation,
        value: fromByteArray(encodeStateAsUpdate(doc)),
        ignoreUndo: true,
      });
    };
    const record = (event: { origin: unknown; type: "undo" | "redo" }) => {
      if (event.origin !== ySyncPluginKey || event.type !== "undo") return;
      undoManager.addGrouped(
        {
          undo: async () => {
            history.undo();
            await persist();
          },
          redo: async () => {
            history.redo();
            await persist();
          },
        },
        props.cell,
      );
    };
    history.on("stack-item-added", record);
    const arrow =
      (direction: "left" | "right" | "up" | "down", key: Navigation) =>
      (state: EditorState, _dispatch: unknown, view?: EditorView) =>
        !!view &&
        state.selection.empty &&
        view.endOfTextblock(direction, state) &&
        latest.current.onNavigate(key);
    const state = EditorState.create({
      schema,
      plugins: [
        ySyncPlugin(yText),
        cursorPlugin,
        keymap({
          Tab: () => latest.current.onNavigate("Tab"),
          "Shift-Tab": () => latest.current.onNavigate("Shift-Tab"),
          Enter: () => latest.current.onNavigate("Enter"),
          Escape: () => latest.current.onNavigate("Escape"),
          "Shift-Enter": (state, dispatch) => {
            dispatch?.(
              state.tr
                .replaceSelectionWith(schema.nodes.hard_break.create())
                .scrollIntoView(),
            );
            return true;
          },
          ...formattingKeymap(schema.marks),
          "Ctrl-Meta-h": (...args) =>
            toggleMark(schema.marks.highlight, {
              color: useUIState.getState().lastUsedHighlight,
            })(...args),
          "Mod-`": toggleMark(schema.marks.code),
          ArrowLeft: arrow("left", "ArrowLeft"),
          ArrowRight: arrow("right", "ArrowRight"),
          ArrowUp: arrow("up", "ArrowUp"),
          ArrowDown: arrow("down", "ArrowDown"),
        }),
        keymap(baseKeymap),
        autolink({
          type: schema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
      ],
    });
    const view = new EditorView(
      { mount: mount.current },
      {
        state,
        transformCopied: (slice) => stripFootnoteRefs(stripCommentMarks(slice)),
        attributes: { "aria-label": latest.current.label },
        dispatchTransaction(this: EditorView, transaction) {
          this.updateState(this.state.apply(transaction));
          updateEditorState(this);
        },
        handlePaste(view, event) {
          const html = event.clipboardData?.getData("text/html") ?? "";
          const tsv =
            event.clipboardData?.getData("text/tab-separated-values") ?? "";
          const text = event.clipboardData?.getData("text/plain") ?? "";
          const grid = parseTableClipboard(html, tsv || text, !!tsv);
          if (grid) {
            latest.current.onPaste(grid);
            return true;
          }
          if (!html && !text) return false;
          const container = document.createElement("div");
          if (html) {
            const doc = new DOMParser().parseFromString(html, "text/html");
            for (const node of Array.from(doc.body.childNodes))
              container.appendChild(node);
          } else {
            for (const line of text.split(/\r\n?|\n/)) {
              const paragraph = document.createElement("p");
              paragraph.textContent = line;
              container.appendChild(paragraph);
            }
          }
          const parsed = tableCellDocument(container);
          const slice = new Slice(parsed.document.firstChild!.content, 0, 0);
          view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
          return true;
        },
        handleDOMEvents: {
          click(_view, event) {
            if (!event.metaKey && !event.ctrlKey) return false;
            const href = (event.target as Element | null)
              ?.closest("a")
              ?.getAttribute("href");
            if (!href || !/^(https?:|mailto:|tel:|[/?#])/i.test(href))
              return false;
            window.open(href, "_blank", "noopener,noreferrer");
            event.preventDefault();
            return true;
          },
        },
        clipboardTextSerializer(slice) {
          return slice.content.textBetween(
            0,
            slice.content.size,
            "\n",
            (node) =>
              node.type.name === "hard_break" ? "\n" : node.attrs.text ?? "",
          );
        },
      },
    );
    function updateEditorState(view: EditorView) {
      useEditorStates.setState((state) => ({
        editorStates: {
          ...state.editorStates,
          [syncID]: { view, editor: view.state },
          ...(props.table && { [props.table]: { view, editor: view.state } }),
        },
      }));
    }
    updateEditorState(view);
    props.editorRef.current = view;
    if (latest.current.caret === "end")
      view.dispatch(
        view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)),
      );
    view.focus();
    view.dom.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    return () => {
      history.off("stack-item-added", record);
      // Global undo callbacks still own the history after the view unmounts.
      if (props.editorRef.current === view) props.editorRef.current = null;
      useEditorStates.setState((state) => {
        if (state.editorStates[syncID]?.view !== view) return state;
        const { [syncID]: _, ...editorStates } = state.editorStates;
        if (props.table && editorStates[props.table]?.view === view)
          delete editorStates[props.table];
        return { editorStates };
      });
      view.destroy();
    };
  }, [
    yText,
    cursorPlugin,
    props.cell,
    props.table,
    props.generation,
    props.editorRef,
    rep,
    undoManager,
    syncID,
  ]);
  return (
    <div className="relative min-h-5">
      {overlay}
      <div
        ref={mount}
        className="tableCellEditor min-h-5 whitespace-pre-wrap outline-none"
      />
    </div>
  );
}
