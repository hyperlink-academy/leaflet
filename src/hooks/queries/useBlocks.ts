import { Block } from "components/Blocks/Block";
import { useMemo } from "react";
import { ReadTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { Fact, useReplicache } from "src/replicache";
import { FilterAttributes } from "src/replicache/attributes";
import { scanIndex, scanIndexLocal } from "src/replicache/utils";

export const useBlocks = (
  entityID: string | null,
  attribute: keyof FilterAttributes<{
    type: "ordered-reference";
  }> = "card/block",
) => {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      entityID === null
        ? []
        : getBlocksWithTypeLocal(rep.initialFacts, entityID, attribute),
    [rep.initialFacts, entityID],
  );
  let repData = useSubscribe(
    rep?.rep,
    async (tx) =>
      entityID === null ? [] : getBlocksWithType(tx, entityID, attribute),
    { dependencies: [entityID] },
  );
  let data = repData || initialValue;
  return data.flatMap((f) => (!f ? [] : [f]));
};

export const useCanvasBlocksWithType = (entityID: string | null) => {
  let rep = useReplicache();
  let initialValue = useMemo(() => {
    if (!entityID) return [];
    let scan = scanIndexLocal(rep.initialFacts);
    let blocks = scan.eav(entityID, "canvas/block");
    return blocks
      .map((b) => {
        let type = scan.eav(b.data.value, "block/type");
        if (!type[0]) return null;
        return {
          ...b.data,
          type: type[0]?.data.value || "text",
        };
      })
      .filter((f) => f !== null);
  }, [rep.initialFacts, entityID]);
  let repData = useSubscribe(
    rep?.rep,
    async (tx) => {
      if (!entityID) return [];
      let scan = scanIndex(tx);
      let blocks = await scan.eav(entityID, "canvas/block");
      return Promise.all(
        blocks.map(async (b) => {
          let type = await scan.eav(b.data.value, "block/type");
          return {
            ...b.data,
            type: type[0].data.value,
          };
        }),
      );
    },
    { dependencies: [entityID] },
  );
  let data = repData || initialValue;
  return data
    .flatMap((f) => (!f ? [] : [f]))
    .sort((a, b) => {
      if (a.position.y === b.position.y) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });
};

export const getBlocksWithType = async (
  tx: ReadTransaction,
  entityID: string,
  attribute: keyof FilterAttributes<{
    type: "ordered-reference";
  }> = "card/block",
) => {
  let initialized = await tx.get("initialized");
  if (!initialized) return null;
  let scan = scanIndex(tx);
  let blocks = await scan.eav(entityID, attribute);

  return (
    await Promise.all(
      blocks
        .sort((a, b) => (a.data.position > b.data.position ? 1 : -1))
        .map(async (b) => {
          let type = (await scan.eav(b.data.value, "block/type"))[0];
          let isList = await scan.eav(b.data.value, "block/is-list");
          if (!type) {
            return null;
          }
          if (isList[0]?.data.value) {
            const getChildren = async (
              root: Fact<keyof FilterAttributes<{ type: "ordered-reference" }>>,
              parent: string,
              depth: number,
              path: { depth: number; entity: string }[],
            ): Promise<Block[]> => {
              let children = (await scan.eav(root.data.value, attribute)).sort(
                (a, b) => (a.data.position > b.data.position ? 1 : -1),
              );
              let type = (await scan.eav(root.data.value, "block/type"))[0];
              let checklist = await scan.eav(
                root.data.value,
                "block/check-list",
              );
              if (!type) {
                return [];
              }
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
  attribute: keyof FilterAttributes<{
    type: "ordered-reference";
  }> = "card/block",
) => {
  let scan = scanIndexLocal(initialFacts);
  let blocks = scan.eav(entityID, attribute);
  return blocks
    .sort((a, b) => (a.data.position > b.data.position ? 1 : -1))
    .map((b) => {
      let type = scan.eav(b.data.value, "block/type")[0];
      let isList = scan.eav(b.data.value, "block/is-list");
      if (!type) return null;
      if (isList[0]?.data.value) {
        const getChildren = (
          root: Fact<keyof FilterAttributes<{ type: "ordered-reference" }>>,
          parent: string,
          depth: number,
          path: { depth: number; entity: string }[],
        ): Block[] => {
          let children = scan
            .eav(root.data.value, attribute)
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
