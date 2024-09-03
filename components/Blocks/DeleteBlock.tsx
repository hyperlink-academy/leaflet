import {
  Fact,
  ReplicacheMutators,
  useEntity,
  useReplicache,
} from "src/replicache";
import { Replicache } from "replicache";
import { useUIState } from "src/useUIState";
import { scanIndex } from "src/replicache/utils";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { focusBlock } from "src/utils/focusBlock";
import { ButtonPrimary } from "components/Buttons";
import { CloseTiny } from "components/Icons";

export const AreYouSure = (props: {
  entityID: string[] | string;
  onClick?: () => void;
  closeAreYouSure: () => void;
  type: Fact<"block/type">["data"]["value"] | undefined;
  compact?: boolean;
}) => {
  let entities = [props.entityID].flat();
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let type = useEntity(focusedBlock?.entityID || null, "block/type")?.data
    .value;

  return (
    <div
      className={`
        w-full ${props.type === "card" ? "h-[104px]" : props.type === "mailbox" ? "h-[92px]" : "h-full"}
        flex items-center justify-center
        border-2 border-border rounded-lg
        ${!props.compact && "bg-border-light"}`}
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

export async function deleteBlock(
  entities: string[],
  rep: Replicache<ReplicacheMutators>,
) {
  let focusedBlock = useUIState.getState().focusedEntity;

  // if the focused thing is a page and not a blcok, return
  if (!focusedBlock || focusedBlock?.entityType === "card") return;
  let [type] = await rep.query((tx) =>
    scanIndex(tx).eav(focusedBlock.entityID, "block/type"),
  );

  // get what cards we need to close as a result of deleting this block
  let cardsToClose = [] as string[];
  if (type.data.value === "card") {
    let [childCards] = await rep?.query(
      (tx) => scanIndex(tx).eav(focusedBlock.entityID, "block/card") || [],
    );
    cardsToClose = [childCards?.data.value];
  }
  if (type.data.value === "mailbox") {
    let [archive] = await rep?.query(
      (tx) => scanIndex(tx).eav(focusedBlock.entityID, "mailbox/archive") || [],
    );
    let [draft] = await rep?.query(
      (tx) => scanIndex(tx).eav(focusedBlock.entityID, "mailbox/draft") || [],
    );
    cardsToClose = [archive?.data.value, draft?.data.value];
  }

  //  the next and previous blocks in the block list
  let siblings =
    (await rep?.query((tx) => getBlocksWithType(tx, focusedBlock?.parent))) ||
    [];

  let prevBlock =
    siblings?.[
      siblings.findIndex((s) => s.value === focusedBlock.entityID) - 1
    ];
  let prevBlockType = await rep?.query((tx) =>
    scanIndex(tx).eav(prevBlock?.value, "block/type"),
  );

  let nextBlock =
    siblings?.[
      siblings.findIndex((s) => s.value === focusedBlock.entityID) + 1
    ];
  let nextBlockType = await rep?.query((tx) =>
    scanIndex(tx).eav(nextBlock?.value, "block/type"),
  );

  if (prevBlock) {
    useUIState.getState().setSelectedBlock({
      value: prevBlock.value,
      parent: prevBlock.parent,
    });

    focusBlock(
      {
        value: prevBlock.value,
        type: prevBlockType?.[0].data.value,
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

  cardsToClose.forEach((card) => card && useUIState.getState().closeCard(card));
  await Promise.all(
    entities.map((entity) =>
      rep?.mutate.removeBlock({
        blockEntity: entity,
      }),
    ),
  );
}
