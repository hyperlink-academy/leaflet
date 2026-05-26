import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { SettingsTriggerButton } from "../SettingsTriggerButton";
import {
  StandardSitePostItem,
  type StandardSitePostSize,
} from "./StandardSitePostItem";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";

export const StandardSitePostBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let uri = useEntity(props.entityID, "block/standard-site-post")?.data.value;
  let sizeFact = useEntity(props.entityID, "standard-site-post/size");
  let size: StandardSitePostSize = sizeFact?.data.value ?? "medium";
  let showPubThemeFact = useEntity(
    props.entityID,
    "standard-site-post/show-publication-theme",
  );
  let showPubTheme = showPubThemeFact?.data.value !== false;
  let editorPub = useLeafletPublicationData();
  let currentPublicationUri = editorPub.data?.publications?.uri ?? null;

  if (!uri) return null;

  return (
    <BlockLayout
      isSelected={!!isSelected}
      hasBackground="page"
      borderOnHover
      className="standardSitePostBlock p-0!"
      extraOptions={
        <StandardSitePostSettingsButton entityID={props.entityID} />
      }
    >
      <StandardSitePostItem
        uri={uri}
        size={size}
        showPubTheme={showPubTheme}
        currentPublicationUri={currentPublicationUri}
      />
    </BlockLayout>
  );
};

function StandardSitePostSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();
  let sizeFact = useEntity(props.entityID, "standard-site-post/size");
  let size: StandardSitePostSize = sizeFact?.data.value ?? "medium";
  let showPubThemeFact = useEntity(
    props.entityID,
    "standard-site-post/show-publication-theme",
  );
  let showPubTheme = showPubThemeFact?.data.value !== false;

  return (
    <Popover
      asChild
      side="top"
      align="end"
      className="flex flex-col gap-2 w-xs pb-3! overflow-y-auto"
      onOpenAutoFocus={(e) => e.preventDefault()}
      trigger={
        <SettingsTriggerButton aria-label="Standard Site Post Settings" />
      }
    >
      <h4>Post Size</h4>
      <div className="flex flex-col gap-3 w-full">
        {(
          [
            { value: "small", Icon: SmallIcon },
            { value: "medium", Icon: MedIcon },
            { value: "large", Icon: LargeIcon },
          ] as {
            value: StandardSitePostSize;
            Icon: (props: { selected: boolean }) => React.ReactNode;
          }[]
        ).map((option) => {
          let selected =
            size === option.value ||
            (option.value === "medium" && size !== "small" && size !== "large");
          return (
            <button
              className="text-left"
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
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
              <option.Icon selected={selected} />
            </button>
          );
        })}
      </div>
      <hr className="border-border-light my-1" />
      <Toggle
        toggle={showPubTheme}
        onToggle={() => {
          if (!rep) return;
          rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "standard-site-post/show-publication-theme",
            data: { type: "boolean", value: !showPubTheme },
          });
        }}
      >
        <div className="font-bold">Use Publication Theme</div>
      </Toggle>
    </Popover>
  );
}

const SmallIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex gap-2 p-2 w-full opaque-container outline-2 outline-offset-1 border-border! ${selected ? "outline-accent-contrast border-accent-contrast!" : "outline-transparent"}`}
    >
      <div className="flex flex-col gap-1 grow min-w-0">
        <div className="w-full h-4 bg-tertiary rounded-[2px]" />

        <div className="flex justify-between mt-1 w-full">
          <div className="w-[60%]  h-2 bg-border rounded-[2px]" />
          <div className="w-6 h-2 bg-border rounded-[2px]" />
        </div>
      </div>
    </div>
  );
};

const MedIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex gap-2  w-full opaque-container outline-2 outline-offset-1 bg-bg-page overflow-hidden border-border! ${selected ? "outline-accent-contrast border-accent-contrast!" : "outline-transparent "}`}
    >
      <div className="flex flex-col gap-1 p-2 grow min-w-0">
        <div className="w-full h-4 bg-tertiary rounded-[2px]" />
        <div className="w-full h-2 bg-tertiary mt-1 rounded-[2px]" />
        <div className="w-full h-2 bg-tertiary rounded-[2px]" />
        <div className="flex justify-between mt-2 w-full">
          <div className="w-[60%]  h-2 bg-border rounded-[2px]" />
          <div className="w-6 h-2 bg-border rounded-[2px]" />
        </div>
      </div>
      <div
        className="aspect-square h-[82px] bg-border border-l border-border shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/imagePlaceholder.png)",
          backgroundBlendMode: "hard-light",
        }}
      />
    </div>
  );
};

const LargeIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex flex-col gap-2 w-full outline-2 outline-offset-1 opaque-container overflow-hidden border-border! ${selected ? "outline-accent-contrast border-accent-contrast!" : "outline-transparent"}`}
    >
      <div
        className="w-full aspect-video bg-border bg-cover bg-center border-b border-border"
        style={{
          backgroundImage: "url(/imagePlaceholder.png)",
          backgroundBlendMode: "hard-light",
        }}
      />

      <div className="flex flex-col gap-1 p-2 pt-0.5!">
        <div className="w-full h-4 bg-tertiary rounded-[2px]" />
        <div className="w-full h-2 bg-tertiary mt-1 rounded-[2px]" />
        <div className="flex justify-between mt-2 w-full">
          <div className="w-[60%]  h-2 bg-border rounded-[2px]" />
          <div className="w-6 h-2 bg-border rounded-[2px]" />
        </div>
      </div>
    </div>
  );
};
