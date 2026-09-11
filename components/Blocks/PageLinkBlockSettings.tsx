import { useEntity, useReplicache } from "src/replicache";
import { Popover } from "components/Popover";
import { SettingsTriggerButton } from "./SettingsTriggerButton";
import { PlaceholderText } from "./PostSizeIcons";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { setEditorPref } from "src/utils/editorPrefs";
import {
  normalizePageLinkDisplay,
  type PageLinkDisplay,
} from "src/utils/pageLinkDisplay";
import { BlockSettingOptions } from "./BlockSettingOptions";

export function usePageLinkDisplay(entityID: string): PageLinkDisplay {
  let fact = useEntity(entityID, "page-link/display");
  return normalizePageLinkDisplay(fact?.data.value);
}

export function PageLinkSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();
  let display = usePageLinkDisplay(props.entityID);

  return (
    <Popover
      asChild
      side="top"
      align="end"
      className="p-0!"
      onOpenAutoFocus={(e) => e.preventDefault()}
      trigger={
        <SettingsTriggerButton
          aria-label="Page Link Settings"
          onClick={(e) => e.stopPropagation()}
        />
      }
    >
      {/* Clicks here would otherwise bubble (through the portal) to the page
          wrapper, which refocuses the page and unmounts the options bar. */}
      <div
        className="flex flex-col gap-2 w-full sm:w-[1000px] sm:max-w-sm pt-1 p-3! overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4>Page Style</h4>
        </div>
        <BlockSettingOptions<PageLinkDisplay>
          options={[
            { value: "full", Icon: FullIcon },
            { value: "compact", Icon: CompactIcon },
          ]}
          value={display}
          onSelect={(value) => {
            if (!rep) return;
            setEditorPref("pageLinkDisplay", value);
            rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "page-link/display",
              data: { type: "page-link-display-union", value },
            });
          }}
        />
      </div>
    </Popover>
  );
}

const FullIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex opaque-container border-tertiary! overflow-hidden w-full h-[52px] ${selected ? "border-accent-contrast!" : ""}`}
    >
      <div className="flex flex-col gap-1 p-2 grow min-w-0">
        {PlaceholderText("lg")}
        {PlaceholderText("md")}
        {PlaceholderText("md", "70%")}
      </div>
      <div className="flex flex-col gap-1 p-1 w-[36px] h-[46px] mt-2 mr-2 shrink-0 border border-border-light rounded-sm rotate-[4deg] bg-bg-page">
        {PlaceholderText("sm")}
        {PlaceholderText("sm")}
        {PlaceholderText("sm", "60%")}
      </div>
    </div>
  );
};

const CompactIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex items-center gap-2 opaque-container border-tertiary! overflow-hidden w-full p-2 ${selected ? "border-accent-contrast!" : ""}`}
    >
      <div className="grow min-w-0">{PlaceholderText("lg")}</div>
      <ArrowRightTiny className="shrink-0 text-tertiary" />
    </div>
  );
};
