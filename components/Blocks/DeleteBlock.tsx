import { useEffect } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { focusBlock } from ".";
import { ButtonPrimary } from "components/Buttons";
import { CloseTiny } from "components/Icons";

export const AreYouSure = (props: {
  entityID: string;
  onClick?: () => void;
  closeAreYouSure: () => void;
  compact?: boolean;
}) => {
  let { rep } = useReplicache();
  let card = useEntity(props.entityID, "block/card");
  let cardID = card ? card.data.value : props.entityID;
  let type = useEntity(props.entityID, "block/type")?.data.value;

  return (
    <div
      className={`flex w-full h-full items-center justify-center ${!props.compact && "bg-border-light"}`}
    >
      <div
        className={`flex h-fit justify-center items-center font-bold text-secondary  ${props.compact ? "flex-row gap-2 justify-between w-full " : "flex-col  py-2 gap-1"}`}
      >
        <div className="text-center w-fit">
          Delete{" "}
          {type === "card" ? <span>Page</span> : <span>Mailbox and Posts</span>}
          ?{" "}
        </div>
        <div className="flex gap-2">
          <ButtonPrimary
            compact
            onClick={(e) => {
              e.stopPropagation();
              // This only handles the case where the literal delete button is clicked.
              // In cases where the backspace button is pressed, each block that uses the AreYouSure
              // has an event listener that handles the backspace key press.
              useUIState.getState().closeCard(cardID);

              rep &&
                rep.mutate.removeBlock({
                  blockEntity: props.entityID,
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
