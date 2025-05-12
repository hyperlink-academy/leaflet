import { useEntity, useReplicache } from "src/replicache";
import { ToolbarButton } from ".";
import { Separator, ShortcutKey } from "components/Layout";
import { metaKey } from "src/utils/metaKey";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { useUIState } from "src/useUIState";
import { LockBlockButton } from "./LockBlockButton";
import { TextAlignmentButton } from "./TextAlignmentToolbar";
import { ImageFullBleedButton } from "./ImageToolbar";
import { DeleteSmall } from "components/Icons/DeleteSmall";

export const BlockToolbar = (props: {
  setToolbarState: (state: "areYouSure" | "block" | "text-alignment") => void;
}) => {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let focusedEntityType = useEntity(
    focusedEntity?.entityType === "page"
      ? focusedEntity.entityID
      : focusedEntity?.parent || null,
    "page/type",
  );
  let blockType = useEntity(
    focusedEntity?.entityType === "block" ? focusedEntity?.entityID : null,
    "block/type",
  )?.data.value;

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={() => {
            props.setToolbarState("areYouSure");
          }}
          tooltipContent="Delete Block"
        >
          <DeleteSmall />
        </ToolbarButton>
        <Separator classname="h-6" />
        <MoveBlockButtons />
        {blockType === "image" && (
          <>
            <TextAlignmentButton setToolbarState={props.setToolbarState} />
            <ImageFullBleedButton />
            {focusedEntityType?.data.value !== "canvas" && (
              <Separator classname="h-6" />
            )}
          </>
        )}
        {(blockType === "button" || blockType === "datetime") && (
          <>
            <TextAlignmentButton setToolbarState={props.setToolbarState} />
            {focusedEntityType?.data.value !== "canvas" && (
              <Separator classname="h-6" />
            )}
          </>
        )}

        <LockBlockButton />
      </div>
    </div>
  );
};

const MoveBlockButtons = () => {
  let { rep } = useReplicache();
  const getSortedSelection = async () => {
    let selectedBlocks = useUIState.getState().selectedBlocks;
    let siblings =
      (await rep?.query((tx) =>
        getBlocksWithType(tx, selectedBlocks[0].parent),
      )) || [];
    let sortedBlocks = siblings.filter((s) =>
      selectedBlocks.find((sb) => sb.value === s.value),
    );
    return [sortedBlocks, siblings];
  };
  return (
    <>
      <ToolbarButton
        hiddenOnCanvas
        onClick={async () => {
          let [sortedBlocks, siblings] = await getSortedSelection();
          if (sortedBlocks.length > 1) return;
          let block = sortedBlocks[0];
          let previousBlock =
            siblings?.[siblings.findIndex((s) => s.value === block.value) - 1];
          if (previousBlock.value === block.listData?.parent) {
            previousBlock =
              siblings?.[
                siblings.findIndex((s) => s.value === block.value) - 2
              ];
          }

          if (
            previousBlock?.listData &&
            block.listData &&
            block.listData.depth > 1 &&
            !previousBlock.listData.path.find(
              (f) => f.entity === block.listData?.parent,
            )
          ) {
            let depth = block.listData.depth;
            let newParent = previousBlock.listData.path.find(
              (f) => f.depth === depth - 1,
            );
            if (!newParent) return;
            if (useUIState.getState().foldedBlocks.includes(newParent.entity))
              useUIState.getState().toggleFold(newParent.entity);
            rep?.mutate.moveBlock({
              block: block.value,
              oldParent: block.listData?.parent,
              newParent: newParent.entity,
              position: { type: "end" },
            });
          } else {
            rep?.mutate.moveBlockUp({
              entityID: block.value,
              parent: block.listData?.parent || block.parent,
            });
          }
        }}
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Move Up</div>
            <div className="flex gap-1">
              <ShortcutKey>Shift</ShortcutKey> +{" "}
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> ↑ </ShortcutKey>
            </div>
          </div>
        }
      >
        <MoveBlockUp />
      </ToolbarButton>

      <ToolbarButton
        hiddenOnCanvas
        onClick={async () => {
          let [sortedBlocks, siblings] = await getSortedSelection();
          if (sortedBlocks.length > 1) return;
          let block = sortedBlocks[0];
          let nextBlock = siblings
            .slice(siblings.findIndex((s) => s.value === block.value) + 1)
            .find(
              (f) =>
                f.listData &&
                block.listData &&
                !f.listData.path.find((f) => f.entity === block.value),
            );
          if (
            nextBlock?.listData &&
            block.listData &&
            nextBlock.listData.depth === block.listData.depth - 1
          ) {
            if (useUIState.getState().foldedBlocks.includes(nextBlock.value))
              useUIState.getState().toggleFold(nextBlock.value);
            rep?.mutate.moveBlock({
              block: block.value,
              oldParent: block.listData?.parent,
              newParent: nextBlock.value,
              position: { type: "first" },
            });
          } else {
            rep?.mutate.moveBlockDown({
              entityID: block.value,
              parent: block.listData?.parent || block.parent,
            });
          }
        }}
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Move Down</div>
            <div className="flex gap-1">
              <ShortcutKey>Shift</ShortcutKey> +{" "}
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> ↓ </ShortcutKey>
            </div>
          </div>
        }
      >
        <MoveBlockDown />
      </ToolbarButton>
      <Separator classname="h-6" />
    </>
  );
};

const MoveBlockDown = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.3444 3.56272L3.89705 5.84775C3.48792 5.91246 3.20871 6.29658 3.27342 6.7057L3.83176 10.2358C3.89647 10.645 4.28058 10.9242 4.68971 10.8595L19.137 8.57444C19.5462 8.50973 19.8254 8.12561 19.7607 7.71649L19.2023 4.18635C19.1376 3.77722 18.7535 3.49801 18.3444 3.56272ZM3.70177 4.61309C2.69864 4.77175 1.9884 5.65049 2.01462 6.63905C1.6067 6.92894 1.37517 7.43373 1.45854 7.96083L2.02167 11.5213C2.19423 12.6123 3.21854 13.3568 4.30955 13.1843L15.5014 11.4142L15.3472 10.4394L16.6131 10.2392L17.2948 13.9166L15.3038 12.4752C14.9683 12.2322 14.4994 12.3073 14.2565 12.6428C14.0135 12.9783 14.0886 13.4472 14.4241 13.6902L18.5417 16.6712L21.5228 12.5536C21.7658 12.2181 21.6907 11.7492 21.3552 11.5063C21.0197 11.2634 20.5508 11.3385 20.3079 11.674L18.7926 13.7669L18.0952 10.0048L19.3323 9.80909C20.4233 9.63654 21.1679 8.61222 20.9953 7.52121L20.437 3.99107C20.2644 2.90007 19.2401 2.15551 18.1491 2.32807L3.70177 4.61309ZM12.5175 14.1726C12.8583 14.118 13.0904 13.7974 13.0358 13.4566C12.9812 13.1157 12.6606 12.8837 12.3198 12.9383L4.48217 14.1937C3.37941 14.3704 2.62785 15.4065 2.80232 16.5096L3.35244 19.9878C3.52716 21.0925 4.56428 21.8463 5.66893 21.6716L20.0583 19.3958C21.1618 19.2212 21.9155 18.186 21.7426 17.0822L21.6508 16.4961C21.5974 16.1551 21.2776 15.922 20.9366 15.9754C20.5956 16.0288 20.3624 16.3486 20.4158 16.6896L20.5077 17.2757C20.5738 17.6981 20.2854 18.0943 19.8631 18.1611L5.47365 20.437C5.05089 20.5038 4.65396 20.2153 4.5871 19.7925L4.03697 16.3143C3.9702 15.8921 4.25783 15.4956 4.67988 15.428L12.5175 14.1726ZM5.48645 8.13141C5.4213 7.72235 5.70009 7.33793 6.10914 7.27278L12.7667 6.21241C13.1757 6.14726 13.5602 6.42605 13.6253 6.83511C13.6905 7.24417 13.4117 7.62859 13.0026 7.69374L6.34508 8.75411C5.93602 8.81926 5.5516 8.54047 5.48645 8.13141Z"
        fill="currentColor"
      />
    </svg>
  );
};

const MoveBlockUp = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.12086 10.3069C3.69777 10.3744 3.30016 10.0858 3.23323 9.66265L2.68364 6.18782C2.61677 5.76506 2.90529 5.36813 3.32805 5.30127L17.7149 3.0258C18.1378 2.95892 18.5348 3.24759 18.6015 3.67049L18.7835 4.82361C18.8373 5.16457 19.1573 5.39736 19.4983 5.34356C19.8392 5.28975 20.072 4.96974 20.0182 4.62878L19.8363 3.47566C19.6619 2.37067 18.6246 1.61639 17.5197 1.79115L3.13278 4.06661C2.02813 4.24133 1.27427 5.27845 1.44899 6.3831L1.99857 9.85793C2.17346 10.9637 3.21238 11.7177 4.31788 11.5413L11.5185 10.392C11.8594 10.3376 12.0916 10.0171 12.0372 9.67628C11.9828 9.33542 11.6624 9.1032 11.3215 9.15761L4.12086 10.3069ZM19.9004 11.6151L5.45305 13.9001C5.04392 13.9649 4.76471 14.349 4.82942 14.7581L5.38775 18.2882C5.45246 18.6974 5.83658 18.9766 6.24571 18.9119L20.6931 16.6268C21.1022 16.5621 21.3814 16.178 21.3167 15.7689L20.7583 12.2388C20.6936 11.8296 20.3095 11.5504 19.9004 11.6151ZM5.25777 12.6655C4.21806 12.8299 3.49299 13.7679 3.57645 14.8C3.17867 15.1511 2.9637 15.6918 3.05264 16.2541L3.57767 19.5737C3.75023 20.6647 4.77455 21.4093 5.86556 21.2367L19.9927 19.0023C20.7197 18.8873 21.2751 18.3524 21.4519 17.6846C22.2223 17.3097 22.6921 16.4638 22.5513 15.5736L21.993 12.0435C21.8204 10.9525 20.7961 10.2079 19.7051 10.3805L17.9019 10.6657L17.3957 7.46986L19.3483 8.96297C19.6773 9.21457 20.148 9.1518 20.3996 8.82276C20.6512 8.49373 20.5885 8.02302 20.2594 7.77141L16.2213 4.68355L13.1334 8.72172C12.8818 9.05076 12.9445 9.52146 13.2736 9.77307C13.6026 10.0247 14.0733 9.96191 14.3249 9.63287L15.8945 7.58034L16.4203 10.9L5.25777 12.6655ZM7.66514 15.3252C7.25609 15.3903 6.97729 15.7748 7.04245 16.1838C7.1076 16.5929 7.49202 16.8717 7.90108 16.8065L14.5586 15.7461C14.9677 15.681 15.2465 15.2966 15.1813 14.8875C15.1162 14.4785 14.7317 14.1997 14.3227 14.2648L7.66514 15.3252Z"
        fill="currentColor"
      />
    </svg>
  );
};
