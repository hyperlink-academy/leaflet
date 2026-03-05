import { useEditorStates } from "src/state/useEditorState";

export function deleteFootnoteFromBlock(
  footnoteEntityID: string,
  blockID: string,
  rep: any,
) {
  if (!rep) return;

  let editorState = useEditorStates.getState().editorStates[blockID];
  if (editorState?.view) {
    let view = editorState.view;
    let { doc } = view.state;
    let tr = view.state.tr;
    let found = false;
    doc.descendants((node, pos) => {
      if (
        found ||
        node.type.name !== "footnote" ||
        node.attrs.footnoteEntityID !== footnoteEntityID
      )
        return;
      found = true;
      tr.delete(pos, pos + node.nodeSize);
    });
    if (found) {
      view.dispatch(tr);
    }
  }

  rep.mutate.deleteFootnote({ footnoteEntityID, blockID });
}
