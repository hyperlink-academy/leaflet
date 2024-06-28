import { create } from "zustand";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
export let useEditorStates = create(() => ({
  lastXPosition: 0,
  editorStates: {} as {
    [entity: string]:
      | {
          editor: InstanceType<typeof EditorState>;
          view?: InstanceType<typeof EditorView>;
        }
      | undefined;
  },
}));

export const setEditorState = (
  entityID: string,
  s: {
    editor: InstanceType<typeof EditorState>;
  },
) => {
  useEditorStates.setState((oldState) => {
    let existingState = oldState.editorStates[entityID];
    return {
      editorStates: {
        ...oldState.editorStates,
        [entityID]: { ...existingState, ...s },
      },
    };
  });
};
