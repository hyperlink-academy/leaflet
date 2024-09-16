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
          icon=<AddTiny className="m-1 shrink-0" />
          label="Create New"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <MenuItem onSelect={() => createNewLeaflet("doc")}>
        <BlockDocPageSmall /> Start New Doc
      </MenuItem>
      <MenuItem
        onSelect={() => {
          createNewLeaflet("canvas");
        }}
      >
        <BlockCanvasPageSmall />
        Start New Canvas
      </MenuItem>
    </Menu>
  );
};
