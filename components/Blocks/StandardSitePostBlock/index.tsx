import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { Popover } from "components/Popover";
import { ToggleGroup } from "components/ToggleGroup";
import { SettingsTriggerButton } from "../SettingsTriggerButton";
import {
  StandardSitePostItem,
  type StandardSitePostSize,
} from "./StandardSitePostItem";

export const StandardSitePostBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let uri = useEntity(props.entityID, "block/standard-site-post")?.data.value;
  let sizeFact = useEntity(props.entityID, "standard-site-post/size");
  let size: StandardSitePostSize = sizeFact?.data.value ?? "small";

  if (!uri) return null;

  return (
    <BlockLayout
      isSelected={!!isSelected}
      hasBackground="page"
      borderOnHover
      className="standardSitePostBlock sm:px-3! sm:py-2! px-2! py-1!"
      extraOptions={
        <StandardSitePostSettingsButton entityID={props.entityID} />
      }
    >
      <StandardSitePostItem uri={uri} size={size} />
    </BlockLayout>
  );
};

function StandardSitePostSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();
  let sizeFact = useEntity(props.entityID, "standard-site-post/size");
  let size: StandardSitePostSize = sizeFact?.data.value ?? "small";

  return (
    <Popover
      asChild
      side="top"
      align="end"
      sideOffset={6}
      trigger={
        <SettingsTriggerButton aria-label="Standard Site Post Settings" />
      }
    >
      <div className="flex flex-col gap-3 text-primary py-1 min-w-[220px]">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-sm">Post Size</div>
          <ToggleGroup<StandardSitePostSize>
            fullWidth
            value={size}
            onChange={(value) => {
              if (!rep) return;
              rep.mutate.assertFact({
                entity: props.entityID,
                attribute: "standard-site-post/size",
                data: { type: "standard-site-post-size-union", value },
              });
            }}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </div>
      </div>
    </Popover>
  );
}
