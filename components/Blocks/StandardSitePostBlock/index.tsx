import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { SettingsTriggerButton } from "../SettingsTriggerButton";
import {
  StandardSitePostItem,
  WithStandardSitePostPublicationTheme,
  type StandardSitePostSize,
} from "./StandardSitePostItem";
import { useStandardSitePost } from "components/StandardSitePostDataProvider";
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
  let { data: post } = useStandardSitePost(uri);

  if (!uri) return null;

  if (!post)
    return (
      <StandardSitePostItem
        uri={uri}
        size={size}
        currentPublicationUri={currentPublicationUri}
      />
    );

  return (
    <BlockLayout
      isSelected={!!isSelected}
      borderOnHover
      className="standardSitePostBlock p-0!"
      extraOptions={
        <StandardSitePostSettingsButton entityID={props.entityID} />
      }
    >
      <WithStandardSitePostPublicationTheme post={post} enabled={showPubTheme}>
        <div className="bg-bg-page">
          <StandardSitePostItem
            uri={uri}
            size={size}
            currentPublicationUri={currentPublicationUri}
          />
        </div>
      </WithStandardSitePostPublicationTheme>
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
  let popoverKey = `${props.entityID}-settings`;
  let setOpenPopover = useUIState((s) => s.setOpenPopover);
  let isOpen = useUIState((s) => s.openPopover === popoverKey);

  return (
    <Popover
      asChild
      side="top"
      align="end"
      className="p-0!"
      open={isOpen}
      onOpenChange={(o) => setOpenPopover(o ? popoverKey : null)}
      onOpenAutoFocus={(e) => e.preventDefault()}
      trigger={
        <SettingsTriggerButton aria-label="Standard Site Post Settings" />
      }
    >
      <div className="flex flex-col gap-2 w-xs pt-1 p-3! overflow-y-auto">
        <div>
          <h4>Post Size</h4>
          <div className="text-sm text-tertiary italic">
            This block links to a Standard Site article.
          </div>
        </div>
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
              (option.value === "medium" &&
                size !== "small" &&
                size !== "large");
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
      </div>
    </Popover>
  );
}

const SmallIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex flex-col pt-1 p-2 outline-2 outline-offset-1 border ${selected ? "accent-container outline-accent-contrast border-accent-contrast " : "opaque-container outline-transparent"}`}
    >
      <div className="text-xs font-bold text-secondary">SMALL</div>
      <div
        className={`flex gap-2 p-2 w-full overflow-hidden opaque-container border-tertiary! ${selected && "border-accent-contrast!"}`}
      >
        <div className="flex flex-col gap-1 grow min-w-0">
          <div className="w-full h-4 bg-border rounded-[2px]" />

          <div className="flex justify-between mt-1 w-full">
            <div className="w-[60%]  h-2 bg-border-light rounded-[2px]" />
            <div className="w-6 h-2 bg-border-light rounded-[2px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

const MedIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex flex-col pt-1 p-2 outline-2 outline-offset-1 border ${selected ? "accent-container outline-accent-contrast border-accent-contrast " : "opaque-container outline-transparent"}`}
    >
      <div className="text-xs font-bold text-secondary">MEDIUM</div>
      <div
        className={`flex opaque-container border-tertiary! overflow-hidden ${selected && "border-accent-contrast!"}`}
      >
        <div className="flex flex-col gap-1 p-2 grow min-w-0">
          <div className="w-full h-4 bg-border rounded-[2px]" />
          <div className="w-full h-2 bg-border mt-1 rounded-[2px]" />
          <div className="w-full h-2 bg-border rounded-[2px]" />
          <div className="flex justify-between mt-2 w-full">
            <div className="w-[60%]  h-2 bg-border-light rounded-[2px]" />
            <div className="w-6 h-2 bg-border-light rounded-[2px]" />
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
    </div>
  );
};

const LargeIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex flex-col pt-1 p-2 outline-2 outline-offset-1 border ${selected ? "accent-container outline-accent-contrast border-accent-contrast " : "opaque-container outline-transparent"}`}
    >
      <div className="text-xs font-bold text-secondary">LARGE</div>
      <div
        className={`flex flex-col gap-1 opaque-container border-tertiary! overflow-hidden ${selected && "border-accent-contrast!"}`}
      >
        <div
          className="w-full aspect-video bg-border bg-cover bg-center border-b border-border"
          style={{
            backgroundImage: "url(/imagePlaceholder.png)",
            backgroundBlendMode: "hard-light",
          }}
        />

        <div className="flex flex-col gap-1 p-2 pt-0.5!">
          <div className="w-full h-4 bg-border rounded-[2px]" />
          <div className="w-full h-2 bg-border mt-1 rounded-[2px]" />
          <div className="flex justify-between mt-2 w-full">
            <div className="w-[60%]  h-2 bg-border-light rounded-[2px]" />
            <div className="w-6 h-2 bg-border-light rounded-[2px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
