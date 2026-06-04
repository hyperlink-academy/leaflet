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
import { SmallIcon, MedIcon, LargeIcon } from "../PostSizeIcons";

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
      <div className="flex flex-col gap-2 w-full sm:w-[1000px] sm:max-w-md pt-1 p-3! overflow-y-auto">
        <div>
          <h4>Post Size</h4>
        </div>
        <div className="flex sm:flex-row flex-col sm:gap-1 gap-2 w-full items-stretch">
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
                className={`PostBlockSizeSettingOption text-left flex flex-col flex-1 pt-1 p-2 outline-2 outline-offset-1 border ${selected ? "accent-container outline-accent-contrast border-accent-contrast " : "opaque-container outline-transparent"}`}
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
                <div className="text-xs font-bold text-secondary uppercase">
                  {option.value}
                </div>
                <div className="flex items-center grow w-full ">
                  <option.Icon selected={selected} />
                </div>
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
