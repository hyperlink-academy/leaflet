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
  let lastPosition =
    existingFootnotes.length > 0
      ? existingFootnotes
          .map((f) => f.data.position)
          .sort()
          .at(-1)!
      : null;
  let position = generateKeyBetween(lastPosition, null);

  await rep.mutate.createFootnote({
    footnoteEntityID,
    blockID,
    permission_set: permissionSet,
    position,
  });

  let node = schema.nodes.footnote.create({ footnoteEntityID });
  let { from } = view.state.selection;
  let tr = view.state.tr.insert(from, node);
  view.dispatch(tr);

  return footnoteEntityID;
}
