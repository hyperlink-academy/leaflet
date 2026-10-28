"use client";

import { createNewLeaflet } from "actions/createNewLeaflet";
import { ActionButton } from "components/ActionBar/ActionButton";
import { ButtonPrimary } from "components/Buttons";
import { AddTiny } from "components/Icons/AddTiny";
import { BlockCanvasPageSmall } from "components/Icons/BlockCanvasPageSmall";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { Menu, MenuItem } from "components/Menu";
import { useIsMobile } from "src/hooks/isMobile";
import { useRouter } from "next/navigation";

// Mobile opens the new leaflet in place as a client navigation; desktop keeps
// home open and opens it in a new tab.
export function useCreateLeaflet() {
  let isMobile = useIsMobile();
  let router = useRouter();
  return async (pageType: "doc" | "canvas") => {
    let id = await createNewLeaflet({ pageType, redirectUser: false });
    let url = `/${id}?focusFirstBlock&addToHome`;
    if (isMobile) router.push(url);
    else window.open(url, "_blank");
  };
}

export const CreateNewLeafletButton = (props: { compact?: boolean }) => {
  let isMobile = useIsMobile();
  let createLeaflet = useCreateLeaflet();
  return (
    <Menu
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="z-[60]!"
      trigger={
        props.compact ? (
          <ButtonPrimary compact className="text-sm!">
            <AddTiny className="scale-90" /> New Doc
          </ButtonPrimary>
        ) : (
          <ActionButton
            labelOnMobile
            id="new-leaflet-button"
            primary
            icon=<AddTiny className="m-1" />
            label="New Doc"
          />
        )
      }
    >
      <MenuItem onSelect={() => createLeaflet("doc")}>
        <BlockDocPageSmall />{" "}
        <div className="flex flex-col">
          <div>New Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem onSelect={() => createLeaflet("canvas")}>
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
};
