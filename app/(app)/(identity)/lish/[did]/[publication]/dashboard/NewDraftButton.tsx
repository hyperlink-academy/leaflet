"use client";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { ActionButton } from "components/ActionBar/ActionButton";
import { ButtonPrimary } from "components/Buttons";
import { AddTiny } from "components/Icons/AddTiny";
import { BlockCanvasPageSmall } from "components/Icons/BlockCanvasPageSmall";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { Menu, MenuItem } from "components/Menu";
import { useRouter } from "next/navigation";
import { useIsMobile } from "src/hooks/isMobile";

export function NewDraftActionButton(props: {
  publication: string;
  compact?: boolean;
}) {
  let router = useRouter();
  let isMobile = useIsMobile();

  async function createDraft(pageType: "doc" | "canvas") {
    let newLeaflet = await createPublicationDraft(props.publication, pageType);
    if (newLeaflet) router.push(`/${newLeaflet}`);
  }

  return (
    <Menu
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="z-[60]!"
      trigger={
        props.compact ? (
          <ButtonPrimary compact className="text-sm!">
            <AddTiny className="scale-90" /> Draft
          </ButtonPrimary>
        ) : (
          <ActionButton
            id="new-leaflet-button"
            primary
            icon=<AddTiny className="m-1" />
            className="w-full"
            label="Draft"
          />
        )
      }
    >
      <MenuItem onSelect={() => createDraft("doc")}>
        <BlockDocPageSmall />{" "}
        <div className="flex flex-col">
          <div>New Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem onSelect={() => createDraft("canvas")}>
        <BlockCanvasPageSmall />
        <div className="flex flex-col">
          New Canvas
          <div className="text-tertiary text-sm font-normal">
            A digital whiteboard
          </div>
        </div>
      </MenuItem>
    </Menu>
  );
}
