import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { ToggleWithLabel } from "components/Toggle";
import { BlockSettings } from "../SettingsTriggerButton";
import {
  StandardSitePublicationItem,
  StandardSitePublicationItemPlaceholder,
} from "./StandardSitePublicationItem";
import { WithPublicationTheme } from "components/ThemeManager/PublicationThemeProvider";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";

export const StandardSitePublicationBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let uri = useEntity(props.entityID, "block/standard-site-publication")?.data
    .value;
  let showPubThemeFact = useEntity(
    props.entityID,
    "standard-site-publication/show-publication-theme",
  );
  let showPubTheme = showPubThemeFact?.data.value !== false;
  let { data: publication } = useStandardSitePublication(
    props.preview ? null : uri,
  );

  if (!uri) return null;

  if (props.preview)
    return (
      <BlockLayout
        isSelected={!!isSelected}
        borderOnHover
        className="standardSitePublicationBlock p-0! overflow-hidden!"
      >
        <div className="bg-bg-page">
          <StandardSitePublicationItemPlaceholder />
        </div>
      </BlockLayout>
    );

  if (!publication)
    return (
      <BlockLayout
        isSelected={!!isSelected}
        borderOnHover
        className="standardSitePublicationBlock p-0! overflow-hidden!"
      >
        <div className="bg-bg-page">
          <StandardSitePublicationItem uri={uri} />
        </div>
      </BlockLayout>
    );

  return (
    <BlockLayout
      isSelected={!!isSelected}
      borderOnHover
      className="standardSitePublicationBlock p-0! overflow-hidden!"
      extraOptions={
        <StandardSitePublicationSettingsButton entityID={props.entityID} />
      }
    >
      <WithPublicationTheme
        record={publication.record}
        uri={publication.uri}
        enabled={showPubTheme}
      >
        <div className="bg-bg-page">
          <StandardSitePublicationItem uri={uri} />
        </div>
      </WithPublicationTheme>
    </BlockLayout>
  );
};

function StandardSitePublicationSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();
  let showPubThemeFact = useEntity(
    props.entityID,
    "standard-site-publication/show-publication-theme",
  );
  let showPubTheme = showPubThemeFact?.data.value !== false;

  return (
    <BlockSettings label="Publication">
      <ToggleWithLabel
        label="Use Publication Theme"
        toggle={showPubTheme}
        onToggle={() => {
          if (!rep) return;
          rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "standard-site-publication/show-publication-theme",
            data: { type: "boolean", value: !showPubTheme },
          });
        }}
      />
    </BlockSettings>
  );
}
