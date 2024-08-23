import { useEffect } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { focusBlock } from ".";

export const AreYouSure = (props: {
  entityID: string;
  onClick?: () => void;
  closeAreYouSure: () => void;
}) => {
  let { rep } = useReplicache();
  let card = useEntity(props.entityID, "block/card");
  let cardID = card ? card.data.value : props.entityID;
  let type = useEntity(props.entityID, "block/type")?.data.value;

  return (
    <div className="flex flex-col gap-1 w-full h-full place-items-center items-center font-bold py-4 bg-border-light">
      <div className="">
        Delete this{" "}
        {type === "card" ? <span>Page</span> : <span>Mailbox and Posts</span>}?{" "}
      </div>
      <div className="flex gap-2">
        <button
          className="bg-accent-1 text-accent-2 px-2 py-1 rounded-md "
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
        </button>
        <button
          className="text-accent-1"
          onClick={() => props.closeAreYouSure()}
        >
          Nevermind
        </button>
      </div>
    </div>
  );
};
