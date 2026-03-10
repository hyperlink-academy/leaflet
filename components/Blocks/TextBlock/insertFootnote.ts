import { EditorView } from "prosemirror-view";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { schema } from "./schema";
import { generateKeyBetween } from "fractional-indexing";
import { scanIndex } from "src/replicache/utils";

export async function insertFootnote(
  view: EditorView,
  blockID: string,
  rep: Replicache<ReplicacheMutators>,
  permissionSet: string,
) {
  let footnoteEntityID = v7();

  let existingFootnotes = await rep.query(async (tx) => {
    let scan = scanIndex(tx);
    return scan.eav(blockID, "block/footnote");
  });

  // Build a map from footnoteEntityID to its fractional-index position
  let positionByEntityID: Record<string, string> = {};
  for (let f of existingFootnotes) {
    positionByEntityID[f.data.value] = f.data.position;
  }

  // Find footnotes that appear before and after the insertion point in the text
  let { from } = view.state.selection;
  let beforePosition: string | null = null;
  let afterPosition: string | null = null;
  let foundInsertionPoint = false;

  view.state.doc.descendants((node, pos) => {
    if (node.type.name === "footnote") {
      let entityID = node.attrs.footnoteEntityID;
      let p = positionByEntityID[entityID];
      if (p !== undefined) {
        if (pos < from) {
          // This footnote is before the insertion point
          if (beforePosition === null || p > beforePosition) {
            beforePosition = p;
          }
        } else {
          // This footnote is at or after the insertion point
          if (!foundInsertionPoint) {
            afterPosition = p;
            foundInsertionPoint = true;
          } else if (afterPosition !== null && p < afterPosition) {
            afterPosition = p;
          }
        }
      }
    }
  });

  let position = generateKeyBetween(beforePosition, afterPosition);

  await rep.mutate.createFootnote({
    footnoteEntityID,
    blockID,
    permission_set: permissionSet,
    position,
  });

  let node = schema.nodes.footnote.create({ footnoteEntityID });
  let tr = view.state.tr.insert(from, node);
  view.dispatch(tr);

  return footnoteEntityID;
}
