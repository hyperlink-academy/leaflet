import { useEditorStates } from "src/state/useEditorState";
import { UndoManager } from "src/undoManager";
import { schema } from "components/Blocks/TextBlock/schema";
import type { Match } from "./findMatches";

export function applyReplacements(
  matches: Match[],
  replacement: string,
  undoManager: UndoManager,
): number {
  if (matches.length === 0) return 0;
  let byBlock = new Map<string, Match[]>();
  for (let match of matches) {
    let existing = byBlock.get(match.blockID);
    if (existing) existing.push(match);
    else byBlock.set(match.blockID, [match]);
  }

  let editorStates = useEditorStates.getState().editorStates;
  let replaced = 0;
  undoManager.startGroup();
  try {
    for (let [blockID, blockMatches] of byBlock) {
      let view = editorStates[blockID]?.view;
      if (!view) continue;
      let tr = view.state.tr;
      for (let match of [...blockMatches].sort((a, b) => b.from - a.from)) {
        if (match.to > tr.doc.content.size) continue;
        let marks = tr.doc.nodeAt(match.from)?.marks ?? [];
        if (replacement)
          tr.replaceWith(
            match.from,
            match.to,
            schema.text(replacement, marks),
          );
        else tr.delete(match.from, match.to);
        replaced++;
      }
      if (tr.steps.length === 0) continue;
      tr.setMeta("bulkOp", true);
      view.dispatch(tr);
    }
  } finally {
    undoManager.endGroup();
  }
  return replaced;
}
