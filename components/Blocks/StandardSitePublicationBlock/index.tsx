import { BlockProps, BlockLayout } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { SettingsTriggerButton } from "../SettingsTriggerButton";
import { StandardSitePublicationItem } from "./StandardSitePublicationItem";
import { WithPublicationTheme } from "components/ThemeManager/PublicationThemeProvider";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";

export const StandardSitePublicationBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let uri = useEntity(props.entityID, "block/standard-site-publication")?.data
    .value;
  let showPubThemeFact = useEntity(
    props.entityID,
    "standard-site-publication/show-publication-theme",
  );
  let showPubTheme = showPubThemeFact?.data.value !== false;
  let { data: publication } = useStandardSitePublication(uri);

  if (!uri) return null;

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
        <SettingsTriggerButton aria-label="Standard Site Publication Settings" />
      }
    >
      <div className="flex flex-col gap-2 w-fit pt-1 p-3! overflow-y-auto">
        <Toggle
          toggle={showPubTheme}
          onToggle={() => {
            if (!rep) return;
            rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "standard-site-publication/show-publication-theme",
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
