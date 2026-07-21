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
//
// The awareness is shared by every editor on the page (one instance per
// realtime connection — see src/yjsRealtime); a cursor state is
// {entityID, editorId, anchor, head}, and each plugin instance only renders
// and owns states matching its own entity/editor.

export const remoteCursorPluginKey = new PluginKey("yjs-remote-cursors");

// Whether an awareness change matters to the editor for `entityID`: some
// changed client's cursor is in this entity now, or was the last time we
// looked (so a caret that left or expired gets un-rendered). Without this
// filter every caret move by anyone, in any block, would trigger a recompute
// in every mounted editor on the page — with a shared awareness, per-entity
// routing happens here at render time instead of on the wire.
export const cursorRelevanceFilter = (
  awareness: Awareness,
  entityID: string,
) => {
  let relevant = new Set<number>();
  // Seed from current state: cursors already stored at mount are rendered
  // directly from getStates() without passing through this filter, so their
  // eventual removal (peer departs, 30s staleness) must still count as
  // relevant or the caret would never be un-rendered.
  awareness.getStates().forEach((state, client) => {
    if (client !== awareness.clientID && state.cursor?.entityID === entityID)
      relevant.add(client);
  });
  return (changes: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    let matters = false;
    for (let client of changes.added.concat(changes.updated, changes.removed)) {
      if (client === awareness.clientID) continue;
      let here =
        awareness.getStates().get(client)?.cursor?.entityID === entityID;
      if (here || relevant.has(client)) matters = true;
      if (here) relevant.add(client);
      else relevant.delete(client);
    }
    return matters;
  };
};

const createSelectionDecorations = (
  state: EditorState,
  awareness: Awareness,
  entityID: string,
) => {
  const ystate = ySyncPluginKey.getState(state);
  const decorations: Decoration[] = [];
  if (
    ystate.snapshot != null ||
    ystate.prevSnapshot != null ||
    ystate.binding === null
  )
    return DecorationSet.create(state.doc, []);
  awareness.getStates().forEach((aw, clientId) => {
    if (clientId === awareness.clientID || aw.cursor == null) return;
    // The entity check is load-bearing, not an optimization: a caret at the
    // end of a block's text encodes as a relative position with a root type
    // name and no item id, which resolves successfully against *every*
    // block's doc.
    if (aw.cursor.entityID !== entityID) return;
    let anchor = relativePositionToAbsolutePosition(
      ystate.doc,
      ystate.type,
      Y.createRelativePositionFromJSON(aw.cursor.anchor),
      ystate.binding.mapping,
    );
    let head = relativePositionToAbsolutePosition(
      ystate.doc,
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

export const remoteCursorPlugin = (awareness: Awareness, entityID: string) => {
  // Ownership token for the shared cursor state. Entity equality isn't
  // enough: the same entity can be mounted by two editors at once (a footnote
  // in the side column and the bottom section), and one unmounting must not
  // clear the caret its still-focused twin owns.
  const editorId = crypto.randomUUID();
  return new Plugin({
    key: remoteCursorPluginKey,
    state: {
      init(_, state) {
        return createSelectionDecorations(state, awareness, entityID);
      },
      apply(tr, prevState, _oldState, newState) {
        const ystate = ySyncPluginKey.getState(newState);
        const meta = tr.getMeta(remoteCursorPluginKey);
        if ((ystate && ystate.isChangeOrigin) || (meta && meta.awarenessUpdated))
          return createSelectionDecorations(newState, awareness, entityID);
        return prevState.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations: (state) => remoteCursorPluginKey.getState(state),
    },
    view: (view) => {
      const relevance = cursorRelevanceFilter(awareness, entityID);
      const awarenessListener = (changes: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        if (!relevance(changes)) return;
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
          // The entity/editor checks in the dedup matter beyond ownership
          // bookkeeping: end-of-text relative positions compare equal across
          // blocks, so position comparison alone could mistake a caret in
          // another block for ours.
          if (
            current.cursor == null ||
            current.cursor.entityID !== entityID ||
            current.cursor.editorId !== editorId ||
            !Y.compareRelativePositions(
              Y.createRelativePositionFromJSON(current.cursor.anchor),
              anchor,
            ) ||
            !Y.compareRelativePositions(
              Y.createRelativePositionFromJSON(current.cursor.head),
              head,
            )
          ) {
            awareness.setLocalStateField("cursor", {
              entityID,
              editorId,
              anchor,
              head,
            });
          }
        } else if (current.cursor?.editorId === editorId) {
          // only clear cursor info this editor instance owns
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
          if (awareness.getLocalState()?.cursor?.editorId === editorId)
            awareness.setLocalStateField("cursor", null);
        },
      };
    },
  });
};
