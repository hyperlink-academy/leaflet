import {
  ArrowRightTiny,
  ListCheckboxSmall,
  ListIndentDecreaseSmall,
  ListIndentIncreaseSmall,
  ListUnorderedSmall,
} from "components/Icons";
import { Separator, ShortcutKey } from "components/Layout";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { metaKey } from "src/utils/metaKey";
import { ToolbarButton } from ".";
import { indent, outdent } from "src/utils/list-operations";
import { useEffect } from "react";
import { useEditorStates } from "src/state/useEditorState";

export const ListButton = (props: { setToolbarState: (s: "list") => void }) => {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let isList = useEntity(focusedBlock?.entityID || null, "block/is-list");

  let { rep } = useReplicache();

  return (
    <div className="flex items-center gap-1">
      <ToolbarButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Make List</div>
            <div className="flex gap-1">
              {
                <>
                  <ShortcutKey> {metaKey()}</ShortcutKey> +{" "}
                  <ShortcutKey> Alt </ShortcutKey> +{" "}
                  <ShortcutKey> L </ShortcutKey>
                </>
              }
            </div>
          </div>
        }
        onClick={(e) => {
          e.preventDefault();
          if (!focusedBlock) return;
          if (!isList?.data.value) {
            rep?.mutate.assertFact({
              entity: focusedBlock?.entityID,
              attribute: "block/is-list",
              data: { value: true, type: "boolean" },
            });
          }
          props.setToolbarState("list");
        }}
      >
        <ListUnorderedSmall />
      </ToolbarButton>
      {isList?.data.value && (
        <ToolbarButton
          tooltipContent="List Options"
          onClick={() => {
            props.setToolbarState("list");
          }}
          className="-ml-1"
        >
          <ArrowRightTiny />
        </ToolbarButton>
      )}
    </div>
  );
};

export const ListToolbar = (props: { onClose: () => void }) => {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let siblings = useBlocks(
    focusedBlock?.type === "block" ? focusedBlock.parent : null,
  );

  let isCheckbox = useEntity(
    focusedBlock?.entityID || null,
    "block/check-list",
  );
  let isList = useEntity(focusedBlock?.entityID || null, "block/is-list");

  let block = siblings.find((s) => s.value === focusedBlock?.entityID);
  let previousBlock =
    siblings[siblings.findIndex((b) => b.value === focusedBlock?.entityID) - 1];
  let { rep } = useReplicache();

  useEffect(() => {
    if (!isList?.data.value) props.onClose();
  }, [props, isList]);

  return (
    <div className="flex items-center gap-[6px]">
      <ToolbarButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Indent Item</div>
            <div className="flex gap-1 justify-center">
              <ShortcutKey>Tab</ShortcutKey>
            </div>
          </div>
        }
        disabled={
          !previousBlock?.listData ||
          previousBlock.listData.depth !== block?.listData?.depth
        }
        onClick={() => {
          if (!rep || !block || !previousBlock) return;
          indent(block, previousBlock, rep);
        }}
      >
        <ListIndentIncreaseSmall />
      </ToolbarButton>
      <ToolbarButton
        disabled={!isList?.data.value}
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Outdent Item</div>
            <div className="flex gap-1 justify-center">
              <ShortcutKey>Shift</ShortcutKey> + <ShortcutKey>Tab</ShortcutKey>
            </div>
          </div>
        }
        onClick={() => {
          if (!rep || !block) return;
          outdent(block, previousBlock, rep);
        }}
      >
        <ListIndentDecreaseSmall />
      </ToolbarButton>
      <Separator classname="h-6" />
      <ToolbarButton
        disabled={!isList?.data.value}
        tooltipContent=<div className="flex flex-col gap-1 justify-center">
          <div className="text-center">Add a Checkbox</div>
          <div className="flex gap-1 font-normal">
            start line with <ShortcutKey>[</ShortcutKey>
            <ShortcutKey>]</ShortcutKey>
          </div>
        </div>
        onClick={() => {
          if (!focusedBlock) return;

          if (!isCheckbox) {
            rep?.mutate.assertFact({
              entity: focusedBlock.entityID,
              attribute: "block/check-list",
              data: { type: "boolean", value: false },
            });
          } else {
            rep?.mutate.retractFact({
              factID: isCheckbox.id,
            });
          }
        }}
      >
        <ListCheckboxSmall />
      </ToolbarButton>
    </div>
  );
};
function setInitialRender(arg0: boolean) {
  throw new Error("Function not implemented.");
}
