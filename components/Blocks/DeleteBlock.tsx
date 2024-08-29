import { useEffect } from "react";
import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { focusBlock } from "src/utils/focusBlock";
import { ButtonPrimary } from "components/Buttons";
import { CloseTiny } from "components/Icons";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { scanIndex } from "src/replicache/utils";
import { Replicache } from "replicache";
import { Block } from "./Block";
import { v7 } from "uuid";
import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";

export const AreYouSure = (props: {
  entityID: string[] | string;
  onClick?: () => void;
  closeAreYouSure: () => void;
  compact?: boolean;
}) => {
  let entities = [props.entityID].flat();
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let childCards = useEntity(focusedBlock?.entityID || null, "block/card");
  let childCardIDs = childCards ? childCards.data.value : props.entityID;
  let type = useEntity(focusedBlock?.entityID || null, "block/type")?.data
    .value;

  return (
    <div
      className={`flex w-full h-full items-center justify-center ${!props.compact && "bg-border-light"}`}
    >
      <div
        className={`flex h-fit justify-center items-center font-bold text-secondary  ${props.compact ? "flex-row gap-2 justify-between w-full " : "flex-col  py-2 gap-1"}`}
      >
        <div className="text-center w-fit">
          Delete{" "}
          {entities.length > 1 ? (
            "Blocks"
          ) : type === "card" ? (
            <span>Page</span>
          ) : type === "mailbox" ? (
            <span>Mailbox and Posts</span>
          ) : (
            <span>Block</span>
          )}
          ?{" "}
        </div>
        <div className="flex gap-2">
          <ButtonPrimary
            autoFocus
            compact
            onClick={async (e) => {
              if (rep)
                await deleteBlock(e, focusedBlock, childCardIDs, entities, rep);
            }}
          >
            Delete
          </ButtonPrimary>
          <button
            className="text-accent-1"
            onClick={() => props.closeAreYouSure()}
          >
            {props.compact ? (
              <CloseTiny className="mx-2 shrink-0" />
            ) : (
              "Nevermind"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

async function deleteBlock(
  e: React.MouseEvent,
  focusedBlock:
    | {
        type: "card";
        entityID: string;
      }
    | {
        type: "block";
        entityID: string;
        parent: string;
      }
    | null,
  childCardIDs: string | string[],
  entities: string[],
  rep: Replicache<ReplicacheMutators>,
) {
  if (!focusedBlock || focusedBlock?.type === "card") return;
  e.stopPropagation();

  let siblings =
    (await rep?.query((tx) => getBlocksWithType(tx, focusedBlock?.parent))) ||
    [];

  let prevBlock =
    siblings?.[
      siblings.findIndex((s) => s.value === focusedBlock.entityID) - 1
    ];
  let prevBlockType = await rep?.query((tx) =>
    scanIndex(tx).eav(nextBlock.value, "block/type"),
  );

  let nextBlock =
    siblings?.[
      siblings.findIndex((s) => s.value === focusedBlock.entityID) + 1
    ];
  let nextBlockType = await rep?.query((tx) =>
    scanIndex(tx).eav(nextBlock.value, "block/type"),
  );
  if (prevBlock) {
    useUIState.getState().setSelectedBlock({
      value: prevBlock.value,
      parent: prevBlock.parent,
    });

    focusBlock(
      {
        value: prevBlock.value,
        type: prevBlockType?.[0]?.data.value,
        parent: prevBlock.parent,
      },
      { type: "end" },
    );
  } else {
    useUIState.getState().setSelectedBlock({
      value: nextBlock.value,
      parent: nextBlock.parent,
    });

    focusBlock(
      {
        value: nextBlock.value,
        type: nextBlockType?.[0]?.data.value,
        parent: nextBlock.parent,
      },
      { type: "start" },
    );
  }

  useUIState.getState().closeCard(childCardIDs);

  entities.forEach((entity) => {
    rep?.mutate.removeBlock({
      blockEntity: entity,
    });
  });
}
