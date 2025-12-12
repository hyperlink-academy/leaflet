import { Fact, useReplicache } from "src/replicache";
import { ButtonPrimary } from "components/Buttons";
import { CloseTiny } from "components/Icons/CloseTiny";
import { deleteBlock } from "src/utils/deleteBlock";

export const AreYouSure = (props: {
  entityID: string[] | string;
  onClick?: () => void;
  closeAreYouSure: () => void;
  type: Fact<"block/type">["data"]["value"] | undefined;
  compact?: boolean;
}) => {
  let entities = [props.entityID].flat();
  let { rep } = useReplicache();

  return (
    <div
      className={`
        w-full
        flex items-center justify-center
        ${
          !props.compact &&
          `bg-border-light border-2 border-border rounded-lg
        ${
          props.type === "card"
            ? "h-[104px]"
            : props.type === "mailbox"
              ? "h-[92px]"
              : "h-full"
        }`
        }`}
    >
      <div
        className={`flex h-fit justify-center items-center font-bold text-secondary  ${props.compact ? "flex-row gap-2 justify-between w-full " : "flex-col  py-2 gap-1"}`}
      >
        <div className="text-center w-fit">
          Delete{" "}
          {entities.length > 1 ? (
            "Blocks"
          ) : props.type === "card" ? (
            <span>Page</span>
          ) : props.type === "mailbox" ? (
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
              e.stopPropagation();
              if (rep) await deleteBlock(entities, rep);
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

