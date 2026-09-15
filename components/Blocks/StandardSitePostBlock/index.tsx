import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { ToggleWithLabel } from "components/Toggle";
import { BlockSettings } from "../SettingsTriggerButton";
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

  return (
    <BlockSettings label="Post" className="w-md">
      <h4>Post Size</h4>
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
      <ToggleWithLabel
        label="Use Publication Theme"
        toggle={showPubTheme}
        onToggle={() => {
          if (!rep) return;
          rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "standard-site-post/show-publication-theme",
            data: { type: "boolean", value: !showPubTheme },
          });
        }}
      />
    </BlockSettings>
  );
}
