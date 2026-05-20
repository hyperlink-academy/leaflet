import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { Popover } from "components/Popover";
import { Radio } from "components/Checkbox";
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
      className="flex flex-col gap-1 w-md"
      trigger={
        <SettingsTriggerButton aria-label="Standard Site Post Settings" />
      }
    >
      <h4>Post Size</h4>

      <div className="flex flex-row gap-1 w-full">
        <div className="flex flex-col gap-1 flex-1">
          {(
            [
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
            ] as { value: StandardSitePostSize; label: string }[]
          ).map((option) => (
            <Radio
              key={option.value}
              id={`standard-site-post-size-${props.entityID}-${option.value}`}
              name={`standard-site-post-size-${props.entityID}`}
              value={option.value}
              checked={size === option.value}
              onChange={(e) => {
                if (!e.currentTarget.checked) return;
                if (!rep) return;
                rep.mutate.assertFact({
                  entity: props.entityID,
                  attribute: "standard-site-post/size",
                  data: {
                    type: "standard-site-post-size-union",
                    value: option.value,
                  },
                });
              }}
            >
              {option.label === "Small" ? <SmallIcon /> : <MedIcon />}
            </Radio>
          ))}
        </div>
        <div className="flex-1">
          <Radio
            id={`standard-site-post-size-${props.entityID}-large`}
            name={`standard-site-post-size-${props.entityID}`}
            value="large"
            checked={size === "large"}
            onChange={(e) => {
              if (!e.currentTarget.checked) return;
              if (!rep) return;
              rep.mutate.assertFact({
                entity: props.entityID,
                attribute: "standard-site-post/size",
                data: {
                  type: "standard-site-post-size-union",
                  value: "large",
                },
              });
            }}
          >
            <LargeIcon />
          </Radio>
        </div>
      </div>
    </Popover>
  );
}

const SmallIcon = () => {
  return (
    <div className="flex gap-2 p-2 w-full light-container">
      <div className="flex flex-col gap-1 grow min-w-0">
        <div className="w-full h-5 bg-tertiary rounded-[2px]" />

        <div className="flex justify-between mt-1 w-full">
          <div className="w-[60%]  h-2 bg-border rounded-[2px]" />
          <div className="w-6 h-2 bg-border rounded-[2px]" />
        </div>
      </div>
    </div>
  );
};

const MedIcon = () => {
  return (
    <div className="flex gap-2 p-2 w-full light-container">
      <div className="flex flex-col gap-1 grow min-w-0">
        <div className="w-full h-5 bg-tertiary rounded-[2px]" />
        <div className="w-full h-3 bg-tertiary mt-1 rounded-[2px]" />
        <div className="w-full h-3 bg-tertiary rounded-[2px]" />
        <div className="flex justify-between mt-2 w-full">
          <div className="w-[60%]  h-2 bg-border rounded-[2px]" />
          <div className="w-6 h-2 bg-border rounded-[2px]" />
        </div>
      </div>
      <div className="aspect-square h-full bg-test shrink-0" />
    </div>
  );
};

const LargeIcon = () => {
  return (
    <div className="flex flex-col gap-2 w-full light-container">
      <div className="w-full aspect-video bg-test rounded-t[2px]" />

      <div className="flex flex-col gap-1 p-2 pt-0.5!">
        <div className="w-full h-5 bg-tertiary rounded-[2px]" />
        <div className="w-full h-3 bg-tertiary mt-1 rounded-[2px]" />
        <div className="w-full h-3 bg-tertiary rounded-[2px]" />
        <div className="flex justify-between mt-2 w-full">
          <div className="w-[60%]  h-2 bg-border rounded-[2px]" />
          <div className="w-6 h-2 bg-border rounded-[2px]" />
        </div>
      </div>
    </div>
  );
};
