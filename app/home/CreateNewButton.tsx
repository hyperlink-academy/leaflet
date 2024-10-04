"use client";

import { createNewLeaflet } from "actions/createNewLeaflet";
import { HoverButton } from "components/Buttons";
import {
  AddTiny,
  BlockCanvasPageSmall,
  BlockDocPageSmall,
  TemplateSmall,
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
      <MenuItem
        onSelect={async () => {
          let id = await createNewLeaflet("doc", false);
          window.open(`/${id}`, "_blank");
        }}
      >
        <BlockDocPageSmall />{" "}
        <div className="flex flex-col">
          <div>Start New Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem
        onSelect={async () => {
          let id = await createNewLeaflet("canvas", false);
          window.open(`/${id}`, "_blank");
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
      <hr className="border-border-light mx-2" />
      <MenuItem onSelect={() => {}}>
        <TemplateSmall />
        Template name here
      </MenuItem>
    </Menu>
  );
};
