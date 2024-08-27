import { useEffect } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { focusBlock } from ".";
import { ButtonPrimary } from "components/Buttons";
import { CloseTiny } from "components/Icons";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { scanIndex } from "src/replicache/utils";

export const AreYouSure = (props: {
  entityID: string[] | string;
  onClick?: () => void;
  closeAreYouSure: () => void;
  compact?: boolean;
}) => {
  let entities = [props.entityID].flat();
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let card = useEntity(focusedBlock?.entityID || null, "block/card");
  let cardID = card ? card.data.value : props.entityID;
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
              if (!focusedBlock || focusedBlock?.type === "card") return;
              e.stopPropagation();
              // This only handles the case where the literal delete button is clicked.
              // In cases where the backspace button is pressed, each block that uses the AreYouSure
              // has an event listener that handles the backspace key press.

              useUIState.getState().closeCard(cardID);

              let siblings =
                (await rep?.query((tx) =>
                  getBlocksWithType(tx, focusedBlock?.parent)
                )) || [];

              let nextBlock =
                siblings?.[
                  siblings.findIndex((s) => s.value === focusedBlock.entityID) -
                    1
                ];

              if (nextBlock) {
                useUIState.getState().setSelectedBlock({
                  value: nextBlock.value,
                  parent: nextBlock.parent,
                });
                let nextBlockType = await rep?.query((tx) =>
                  scanIndex(tx).eav(nextBlock.value, "block/type")
                );
                if (
                  nextBlockType?.[0]?.data.value === "text" ||
                  nextBlockType?.[0]?.data.value === "heading"
                ) {
                  focusBlock(
                    {
                      value: nextBlock.value,
                      type: "text",
                      parent: nextBlock.parent,
                    },
                    { type: "end" }
                  );
                }
              }
              props.closeAreYouSure();
              entities.forEach((entity) => {
                rep?.mutate.removeBlock({
                  blockEntity: entity,
                });
              });

              props.onClick && props.onClick();
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
