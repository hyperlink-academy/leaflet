import { Block } from "components/Blocks/Block";
import { Replicache } from "replicache";
import { Fact, ReplicacheMutators } from "src/replicache";
import { Attribute } from "src/replicache/attributes";
import {
  BlockStructureMirror,
  getBlockStructureMirror,
} from "src/replicache/blockMirror";
import { scanIndexLocal } from "src/replicache/utils";

// Headings own the blocks that follow them in document order until the next
// heading of equal-or-higher level (Obsidian-style sections). That ownership is
// positional, not structural, so we derive it here and hang a headingPath on
// each block — the heading-folding analog of listData.path.
//
// Only assign headingPath when there's an enclosing section: an explicit
// `headingPath: undefined` would add an own-key that the deepEquals guard in
// the mirror hooks (which compares by own-key count) counts, masking a real
// change like text→list and silently suppressing the update.
function computeHeadingSections(blocks: Block[]): void {
  let stack: { entity: string; level: number }[] = [];
  for (let block of blocks) {
    let isHeading = block.type === "heading" && !block.listData;
    let level = block.headingLevel ?? 1;
    if (isHeading)
      while (stack.length > 0 && stack[stack.length - 1].level >= level)
        stack.pop();
    if (stack.length) block.headingPath = stack.map((s) => s.entity);
    if (isHeading) stack.push({ entity: block.entityID, level });
  }
}

// A block is hidden when collapsed by a fold: either a folded list ancestor on
// its own listData.path (excluding itself, so the folded row stays visible), or
// a folded heading whose section contains it.
export function isBlockHidden(block: Block, foldedBlocks: string[]): boolean {
  return (
    (block.listData?.path.some(
      (p) => foldedBlocks.includes(p.entity) && p.entity !== block.entityID,
    ) ??
      false) ||
    (block.headingPath?.some((h) => foldedBlocks.includes(h)) ?? false)
  );
}

function computeDisplayNumbers(blocks: Block[]): void {
  let counters = new Map<string, number>();
  for (let block of blocks) {
    if (!block.listData) {
      counters.clear();
      continue;
    }
    if (block.listData.listStyle !== "ordered") continue;
    let parent = block.listData.parent;
    if (block.listData.listStart !== undefined) {
      counters.set(parent, block.listData.listStart);
    } else if (!counters.has(parent)) {
      counters.set(parent, 1);
    }
    block.listData.displayNumber = counters.get(parent)!;
    counters.set(parent, counters.get(parent)! + 1);
  }
}

// Synchronous scan interface shared by the two sync fact sources: the
// initialFacts array (SSR/first paint) and the live BlockStructureMirror.
export type SyncScan = {
  eav<A extends Attribute>(entity: string, attribute: A): SafeArray<Fact<A>>;
};

function assembleBlocks(scan: SyncScan, entityID: string): Block[] {
  let blocks = scan.eav(entityID, "card/block");
  let result = blocks
    .toSorted((a, b) => {
      if (a.data.position === b.data.position) return a.id > b.id ? 1 : -1;
      return a.data.position > b.data.position ? 1 : -1;
    })
    .map((b) => {
      let type = scan.eav(b.data.value, "block/type")[0];
      let isList = scan.eav(b.data.value, "block/is-list");
      if (!type) return null;
      let headingLevel =
        type.data.value === "heading"
          ? scan.eav(b.data.value, "block/heading-level")[0]?.data.value
          : undefined;
      if (isList[0]?.data.value) {
        const getChildren = (
          root: Fact<"card/block">,
          parent: string,
          depth: number,
          path: { depth: number; entity: string }[],
        ): Block[] => {
          let children = scan
            .eav(root.data.value, "card/block")
            .toSorted((a, b) => {
              if (a.data.position === b.data.position)
                return a.id > b.id ? 1 : -1;
              return a.data.position > b.data.position ? 1 : -1;
            });
          let type = scan.eav(root.data.value, "block/type")[0];
          let checklist = scan.eav(root.data.value, "block/check-list");
          let listStyle = scan.eav(root.data.value, "block/list-style")[0];
          let listNumber = scan.eav(root.data.value, "block/list-number")[0];
          if (!type) return [];
          let newPath = [...path, { entity: root.data.value, depth }];
          let childBlocks = children.map((c) =>
            getChildren(c, root.data.value, depth + 1, newPath),
          );
          return [
            {
              entityID: root.data.value,
              position: root.data.position,
              factID: root.id,
              type: type.data.value,
              parent: b.entity,
              listData: {
                depth: depth,
                parent,
                path: newPath,
                checklist: !!checklist[0],
                checked: checklist[0]?.data.value,
                listStyle: listStyle?.data.value,
                listStart: listNumber?.data.value,
              },
            },
            ...childBlocks.flat(),
          ];
        };
        return getChildren(b, b.entity, 1, []);
      }
      return [
        {
          entityID: b.data.value,
          position: b.data.position,
          factID: b.id,
          type: type.data.value,
          parent: b.entity,
          ...(headingLevel !== undefined && { headingLevel }),
        },
      ] as Block[];
    })
    .flat()
    .filter((f) => f !== null);

  computeHeadingSections(result);
  computeDisplayNumbers(result);
  return result;
}

export const getBlocksWithTypeLocal = (
  initialFacts: Fact<any>[],
  entityID: string,
) => assembleBlocks(scanIndexLocal(initialFacts), entityID);

export const getBlocksFromMirror = (
  mirror: BlockStructureMirror,
  entityID: string,
) => assembleBlocks(mirror, entityID);

// One-shot block-list read for event handlers and commands. Reads the mirror
// synchronously — safe anywhere outside a mutator body, since watch diffs are
// applied before a mutation's promise resolves, so any awaited mutation is
// already reflected. Returns [] until the first pull lands. A freshly created
// mirror populates asynchronously, so this relies on the render hooks having
// created it at mount — don't call it before the page has rendered.
export const getPageBlocks = (
  rep: Replicache<ReplicacheMutators>,
  entityID: string,
) => assembleBlocks(getBlockStructureMirror(rep), entityID);
