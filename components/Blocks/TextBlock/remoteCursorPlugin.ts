import * as Y from "yjs";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin, PluginKey, EditorState } from "prosemirror-state";
import { Awareness } from "y-protocols/awareness";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  setMeta,
  ySyncPluginKey,
} from "y-prosemirror";
import { cursorColors } from "./collabCursor";

// A trimmed-down replacement for y-prosemirror's yCursorPlugin. It keeps the
// two safe responsibilities — publishing the local selection to awareness,
// and rendering remote selections as inline decorations (which only style
// existing text) — but does NOT insert a cursor widget into the editable
// DOM. Widget decorations become contenteditable=false islands with text
// nodes inside the editor, which break native selection-handle drags on
// mobile whenever the selection range crosses them (see
// https://github.com/ProseMirror/prosemirror/issues/565). Remote carets are
// instead drawn by the RemoteCursors overlay, positioned from
// view.coordsAtPos outside the contenteditable — the same architecture
// Lexical's and slate-yjs's collaborative cursors use.

export const remoteCursorPluginKey = new PluginKey("yjs-remote-cursors");

const createSelectionDecorations = (
  state: EditorState,
  awareness: Awareness,
) => {
  const ystate = ySyncPluginKey.getState(state);
  const y = ystate.doc;
  const decorations: Decoration[] = [];
  if (
    ystate.snapshot != null ||
    ystate.prevSnapshot != null ||
    ystate.binding === null
  )
    return DecorationSet.create(state.doc, []);
  awareness.getStates().forEach((aw, clientId) => {
    if (clientId === y.clientID || aw.cursor == null) return;
    let anchor = relativePositionToAbsolutePosition(
      y,
      ystate.type,
      Y.createRelativePositionFromJSON(aw.cursor.anchor),
      ystate.binding.mapping,
    );
    let head = relativePositionToAbsolutePosition(
      y,
      ystate.type,
      Y.createRelativePositionFromJSON(aw.cursor.head),
      ystate.binding.mapping,
    );
    if (anchor === null || head === null) return;
    const maxsize = Math.max(state.doc.content.size - 1, 0);
    anchor = Math.min(anchor, maxsize);
    head = Math.min(head, maxsize);
    if (anchor === head) return;
    decorations.push(
      Decoration.inline(
        Math.min(anchor, head),
        Math.max(anchor, head),
        {
          style: `background-color: ${cursorColors(aw.user?.hue ?? 0).selection}`,
          class: "ProseMirror-yjs-selection",
        },
        { inclusiveEnd: true, inclusiveStart: false },
      ),
    );
  });
  return DecorationSet.create(state.doc, decorations);
};

export const remoteCursorPlugin = (awareness: Awareness) =>
  new Plugin({
    key: remoteCursorPluginKey,
    state: {
      init(_, state) {
        return createSelectionDecorations(state, awareness);
      },
      apply(tr, prevState, _oldState, newState) {
        const ystate = ySyncPluginKey.getState(newState);
        const meta = tr.getMeta(remoteCursorPluginKey);
        if ((ystate && ystate.isChangeOrigin) || (meta && meta.awarenessUpdated))
          return createSelectionDecorations(newState, awareness);
        return prevState.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations: (state) => remoteCursorPluginKey.getState(state),
    },
    view: (view) => {
      const awarenessListener = () => {
        if ((view as any).docView)
          setMeta(view, remoteCursorPluginKey, { awarenessUpdated: true });
      };
      // Publish the local selection to the awareness 'cursor' field, same as
      // yCursorPlugin's updateCursorInfo.
      const updateCursorInfo = () => {
        const ystate = ySyncPluginKey.getState(view.state);
        const current = awareness.getLocalState() || {};
        if (ystate.binding == null) return;
        if (view.hasFocus()) {
          const selection = view.state.selection;
          const anchor = absolutePositionToRelativePosition(
            selection.anchor,
            ystate.type,
            ystate.binding.mapping,
          );
          const head = absolutePositionToRelativePosition(
            selection.head,
            ystate.type,
            ystate.binding.mapping,
          );
          if (
            current.cursor == null ||
            !Y.compareRelativePositions(
              Y.createRelativePositionFromJSON(current.cursor.anchor),
              anchor,
            ) ||
            !Y.compareRelativePositions(
              Y.createRelativePositionFromJSON(current.cursor.head),
              head,
            )
          ) {
            awareness.setLocalStateField("cursor", { anchor, head });
          }
        } else if (
          current.cursor != null &&
          relativePositionToAbsolutePosition(
            ystate.doc,
            ystate.type,
            Y.createRelativePositionFromJSON(current.cursor.anchor),
            ystate.binding.mapping,
          ) !== null
        ) {
          // only clear cursor info that this editor binding owns
          awareness.setLocalStateField("cursor", null);
        }
      };
      awareness.on("change", awarenessListener);
      view.dom.addEventListener("focusin", updateCursorInfo);
      view.dom.addEventListener("focusout", updateCursorInfo);
      return {
        update: updateCursorInfo,
        destroy: () => {
          view.dom.removeEventListener("focusin", updateCursorInfo);
          view.dom.removeEventListener("focusout", updateCursorInfo);
          awareness.off("change", awarenessListener);
          awareness.setLocalStateField("cursor", null);
        },
      };
    },
  });
