import { Block } from "components/Blocks";
import { useMemo } from "react";
import { ReadTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { Fact, useReplicache } from "src/replicache";
import { scanIndex, scanIndexLocal } from "src/replicache/utils";

export const useBlocks = (entityID: string | null) => {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      entityID === null
        ? []
        : getBlocksWithTypeLocal(rep.initialFacts, entityID),
    [rep.initialFacts, entityID],
  );
  let repData = useSubscribe(
    rep?.rep,
    async (tx) => (entityID === null ? [] : getBlocksWithType(tx, entityID)),
    { dependencies: [entityID] },
  );
  let data = repData || initialValue;
  return data.flatMap((f) => (!f ? [] : [f]));
};

export const getBlocksWithType = async (
  tx: ReadTransaction,
  entityID: string,
) => {
  let initialized = await tx.get("initialized");
  if (!initialized) return null;
  let scan = scanIndex(tx);
  let blocks = await scan.eav(entityID, "card/block");

  return (
    await Promise.all(
      blocks
        .sort((a, b) => (a.data.position > b.data.position ? 1 : -1))
        .map(async (b) => {
          let type = (await scan.eav(b.data.value, "block/type"))[0];
          let isList = await scan.eav(b.data.value, "block/is-list");
          if (!type) return null;
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
};

export const getBlocksWithTypeLocal = (
  initialFacts: Fact<any>[],
  entityID: string,
) => {
  let scan = scanIndexLocal(initialFacts);
  let blocks = scan.eav(entityID, "card/block");
  return blocks
    .sort((a, b) => (a.data.position > b.data.position ? 1 : -1))
    .map((b) => {
      let type = scan.eav(b.data.value, "block/type")[0];
      let isList = scan.eav(b.data.value, "block/is-list");
      if (!type) return null;
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
              listData: { depth: depth, parent, path: newPath },
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
};
