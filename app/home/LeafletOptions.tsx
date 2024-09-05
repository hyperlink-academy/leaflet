"use client";
import { DeleteSmall, MoreOptionsTiny } from "components/Icons";
import { Menu, MenuItem } from "components/Layout";
import { PermissionToken } from "src/replicache";
import { mutate } from "swr";
import { hideDoc } from "./storage";

export const LeafletOptions = (props: {
  leaflet: PermissionToken;
  setState: (s: "normal" | "deleting") => void;
}) => {
  return (
    <>
      <Menu
        trigger={
          <div className="bg-accent-1 text-accent-2 px-2 py-1 border border-accent-2 rounded-md">
            <MoreOptionsTiny />
          </div>
        }
      >
        <MenuItem
          onSelect={() => {
            hideDoc(props.leaflet);
            mutate("leaflets");
          }}
        >
          Hide from home{" "}
        </MenuItem>
        <MenuItem
          onSelect={(e) => {
            props.setState("deleting");
          }}
        >
          <DeleteSmall />
          Delete Leaflet
        </MenuItem>
      </Menu>
    </>
  );
};
