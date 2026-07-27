import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import type { Fact, ReplicacheMutators } from "src/replicache";
import { elementId } from "src/utils/elementId";

// Insert a new block after `position` (and before `nextPosition`) in `parent`,
// returning the new block's entity ID.
export async function addBlockBelow(
  rep: Replicache<ReplicacheMutators>,
  args: {
    parent: string;
    position: string | null;
    nextPosition: string | null;
    permission_set: string;
    type: Fact<"block/type">["data"]["value"];
  },
): Promise<string> {
  let newEntityID = v7();
  await rep.mutate.addBlock({
    parent: args.parent,
    factID: v7(),
    permission_set: args.permission_set,
    type: args.type,
    position: generateKeyBetween(args.position, args.nextPosition),
    newEntityID,
  });
  return newEntityID;
}

// Focus a just-created text block. The delay is load-bearing: the editor
// mounts asynchronously, and focusing immediately corrupts fast End+Enter
// split sequences.
export function focusNewTextBlock(entityID: string) {
  setTimeout(() => {
    document.getElementById(elementId.block(entityID).text)?.focus();
  }, 10);
}
