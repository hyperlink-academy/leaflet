import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected, useUIState } from "src/useUIState";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { SettingsTriggerButton } from "../SettingsTriggerButton";
import {
  StandardSitePostItem,
  StandardSitePostItemPlaceholder,
  type StandardSitePostSize,
} from "./StandardSitePostItem";
import { useStandardSitePost } from "components/StandardSitePostDataProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { SmallIcon, MedIcon, LargeIcon } from "../PostSizeIcons";
import { BlockSettingOptions } from "../BlockSettingOptions";
import { PublicationThemeWrapper } from "components/ThemeManager/PublicationThemeProvider";

export const StandardSitePostBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let isSelected = useIsBlockSelected(props.entityID);
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
  let { data: post } = useStandardSitePost(props.preview ? null : uri);

  if (!uri) return null;

  if (props.preview)
    return (
      <BlockLayout
        isSelected={!!isSelected}
        borderOnHover
        className="standardSitePostBlock p-0! overflow-hidden!"
      >
        <div className="bg-bg-page">
          <StandardSitePostItemPlaceholder size={size} />
        </div>
      </BlockLayout>
    );

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
      className="standardSitePostBlock p-0! overflow-hidden!"
      extraOptions={
        <StandardSitePostSettingsButton entityID={props.entityID} />
      }
    >
      <PublicationThemeWrapper
        postRecord={post.record}
        pubRecord={post.publication?.record ?? undefined}
        enabled={showPubTheme}
      >
        <div className="bg-bg-page">
          <StandardSitePostItem
            uri={uri}
            size={size}
            currentPublicationUri={currentPublicationUri}
          />
        </div>
      </PublicationThemeWrapper>
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
        <BlockSettingOptions<StandardSitePostSize>
          options={[
            { value: "small", Icon: SmallIcon },
            { value: "medium", Icon: MedIcon },
            { value: "large", Icon: LargeIcon },
          ]}
          value={size === "small" || size === "large" ? size : "medium"}
          onSelect={(value) => {
            if (!rep) return;
            rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "standard-site-post/size",
              data: { type: "standard-site-post-size-union", value },
            });
          }}
        />
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
