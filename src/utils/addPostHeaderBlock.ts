import { v7 } from "uuid";
import type { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import {
  POST_HEADER_BLOCK_POSITION,
  POST_HEADER_BLOCK_WIDTH,
} from "./postHeaderBlock";

// Adds a post header block to a canvas page unless it already has one. Used
// when a canvas leaflet is moved into a publication after creation.
export async function addPostHeaderBlock(
  rep: Replicache<ReplicacheMutators>,
  args: { page: string; permission_set: string },
) {
  let hasHeader = await rep.query(async (tx) => {
    let scan = scanIndex(tx);
    let [pageType] = await scan.eav(args.page, "page/type");
    if (pageType?.data.value !== "canvas") return true;
    let blocks = await scan.eav(args.page, "canvas/block");
    for (let b of blocks) {
      let [type] = await scan.eav(b.data.value, "block/type");
      if (type?.data.value === "post-header") return true;
    }
    return false;
  });
  if (hasHeader) return;
  await rep.mutate.addCanvasBlock({
    newEntityID: v7(),
    factID: v7(),
    parent: args.page,
    permission_set: args.permission_set,
    type: "post-header",
    position: POST_HEADER_BLOCK_POSITION,
    width: POST_HEADER_BLOCK_WIDTH,
  });
}
