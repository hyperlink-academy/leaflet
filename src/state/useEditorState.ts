import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Command, EditorState, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
export let useEditorStates = create(
  subscribeWithSelector(() => ({
    lastXPosition: 0,
    editorStates: {} as {
      [entity: string]:
        | {
            editor: InstanceType<typeof EditorState>;
            initial?: boolean;
            view: InstanceType<typeof EditorView>;
            keymap?: { [key: string]: Command };
          }
        | undefined;
    },
  })),
);

export const setEditorState = (
  entityID: string,
  s: {
    editor: InstanceType<typeof EditorState>;
  },
) => {
  useEditorStates.setState((oldState) => {
    let existingState = oldState.editorStates[entityID];
    if (!existingState) return oldState;
    return {
      editorStates: {
        ...oldState.editorStates,
        [entityID]: { ...existingState, ...s },
      },
    };
  });
};

// Undo/redo snapshots are whole EditorStates, tied to the editor that recorded
// them. A block that has since remounted (moved into or out of a canvas group)
// has a new editor and yjs binding, and swapping in the old state would never
// reach the live doc, so replay the snapshot's content into it instead.
export const restoreEditorState = (entityID: string, s: EditorState) => {
  let live = useEditorStates.getState().editorStates[entityID];
  if (!live) return;
  if (live.editor.plugins === s.plugins)
    return setEditorState(entityID, { editor: s });
  let tr = live.editor.tr.replaceWith(
    0,
    live.editor.doc.content.size,
    s.doc.content,
  );
  let head = Math.min(s.selection.head, tr.doc.content.size);
  tr.setSelection(Selection.near(tr.doc.resolve(head)));
  tr.setMeta("addToHistory", false);
  if (live.view) live.view.dispatch(tr);
  else setEditorState(entityID, { editor: live.editor.apply(tr) });
};
