import { Block } from "components/Blocks/Block";
import { ReadTransaction } from "replicache";
import { Fact } from "src/replicache";
import { scanIndex, scanIndexLocal } from "src/replicache/utils";

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

export const getBlocksWithType = async (
  tx: ReadTransaction,
  entityID: string,
) => {
  let initialized = await tx.get("initialized");
  if (!initialized) return null;
  let scan = scanIndex(tx);
  let blocks = await scan.eav(entityID, "card/block");

  let result = (
    await Promise.all(
      blocks
        .sort((a, b) => {
          if (a.data.position === b.data.position) return a.id > b.id ? 1 : -1;
          return a.data.position > b.data.position ? 1 : -1;
        })
        .map(async (b) => {
          let type = (await scan.eav(b.data.value, "block/type"))[0];
          let isList = await scan.eav(b.data.value, "block/is-list");
          if (!type) return null;
          // All lists use recursive structure
          if (isList[0]?.data.value) {
            const getChildren = async (
              root: Fact<"card/block">,
              parent: string,
              depth: number,
              path: { depth: number; entity: string }[],
            ): Promise<Block[]> => {
              let children = (
                await scan.eav(root.data.value, "card/block")
              ).sort((a, b) => (a.data.position > b.data.position ? 1 : -1));
              let type = (await scan.eav(root.data.value, "block/type"))[0];
              let checklist = await scan.eav(
                root.data.value,
                "block/check-list",
              );
              let listStyle = (await scan.eav(root.data.value, "block/list-style"))[0];
              let listNumber = (await scan.eav(root.data.value, "block/list-number"))[0];
              if (!type) return [];
              let newPath = [...path, { entity: root.data.value, depth }];
              let childBlocks = await Promise.all(
                children.map((c) =>
                  getChildren(c, root.data.value, depth + 1, newPath),
                ),
              );
              return [
                {
                  ...root.data,
                  factID: root.id,
                  type: type.data.value,
                  parent: b.entity,
                  listData: {
                    depth: depth,
                    parent,
                    path: newPath,
                    checklist: !!checklist[0],
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
              ...b.data,
              factID: b.id,
              type: type.data.value,
              parent: b.entity,
            },
          ] as Block[];
        }),
    )
  )
    .flat()
    .filter((f) => f !== null);

  computeDisplayNumbers(result);
  return result;
};

export const getBlocksWithTypeLocal = (
  initialFacts: Fact<any>[],
  entityID: string,
) => {
  let scan = scanIndexLocal(initialFacts);
  let blocks = scan.eav(entityID, "card/block");
  let result = blocks
    .sort((a, b) => {
      if (a.data.position === b.data.position) return a.id > b.id ? 1 : -1;
      return a.data.position > b.data.position ? 1 : -1;
    })
    .map((b) => {
      let type = scan.eav(b.data.value, "block/type")[0];
      let isList = scan.eav(b.data.value, "block/is-list");
      if (!type) return null;
      // All lists use recursive structure
      if (isList[0]?.data.value) {
        const getChildren = (
          root: Fact<"card/block">,
          parent: string,
          depth: number,
          path: { depth: number; entity: string }[],
        ): Block[] => {
          let children = scan
            .eav(root.data.value, "card/block")
            .sort((a, b) => (a.data.position > b.data.position ? 1 : -1));
          let type = scan.eav(root.data.value, "block/type")[0];
          let listStyle = scan.eav(root.data.value, "block/list-style")[0];
          let listNumber = scan.eav(root.data.value, "block/list-number")[0];
          if (!type) return [];
          let newPath = [...path, { entity: root.data.value, depth }];
          let childBlocks = children.map((c) =>
            getChildren(c, root.data.value, depth + 1, newPath),
          );
          return [
            {
              ...root.data,
              factID: root.id,
              type: type.data.value,
              parent: b.entity,
              listData: {
                depth: depth,
                parent,
                path: newPath,
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
          ...b.data,
          factID: b.id,
          type: type.data.value,
          parent: b.entity,
        },
      ] as Block[];
    })
    .flat()
    .filter((f) => f !== null);

  computeDisplayNumbers(result);
  return result;
};
