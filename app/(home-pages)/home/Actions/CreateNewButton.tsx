"use client";

import { createNewLeaflet } from "actions/createNewLeaflet";
import { ActionButton } from "components/ActionBar/ActionButton";
import { AddTiny } from "components/Icons/AddTiny";
import { BlockCanvasPageSmall } from "components/Icons/BlockCanvasPageSmall";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { Menu, MenuItem } from "components/Layout";
import { useIsMobile } from "src/hooks/isMobile";

export const CreateNewLeafletButton = (props: {}) => {
  let isMobile = useIsMobile();
  let openNewLeaflet = (id: string) => {
    if (isMobile) {
      window.location.href = `/${id}?focusFirstBlock`;
    } else {
      window.open(`/${id}?focusFirstBlock`, "_blank");
    }
  };
  return (
    <Menu
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      trigger={
        <ActionButton
          id="new-leaflet-button"
          primary
          icon=<AddTiny className="m-1 shrink-0" />
          label="New"
        />
      }
    >
      <MenuItem
        onSelect={async () => {
          let id = await createNewLeaflet({
            pageType: "doc",
            redirectUser: false,
          });
          openNewLeaflet(id);
        }}
      >
        <BlockDocPageSmall />{" "}
        <div className="flex flex-col">
          <div>New Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem
        onSelect={async () => {
          let id = await createNewLeaflet({
            pageType: "canvas",
            redirectUser: false,
          });
          openNewLeaflet(id);
        }}
      >
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
