"use client";

import { createNewLeaflet } from "actions/createNewLeaflet";
import { HoverButton } from "components/Buttons";
import {
  AddTiny,
  BlockCanvasPageSmall,
  BlockDocPageSmall,
} from "components/Icons";
import { Menu, MenuItem } from "components/Layout";

export const CreateNewLeafletButton = (props: {}) => {
  return (
    <Menu
      trigger={
        <HoverButton
          noLabelOnMobile
          icon=<AddTiny className="m-1 shrink-0" />
          label="New Leaflet"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <MenuItem onSelect={() => createNewLeaflet("doc")}>
        <BlockDocPageSmall />{" "}
        <div className="flex flex-col">
          <div>Start New Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem
        onSelect={() => {
          createNewLeaflet("canvas");
        }}
      >
        <BlockCanvasPageSmall />
        <div className="flex flex-col">
          Start New Canvas
          <div className="text-tertiary text-sm font-normal">
            A digital whiteboard
          </div>
        </div>
      </MenuItem>
    </Menu>
  );
};
