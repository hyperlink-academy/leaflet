"use client";
import { DeleteSmall, MoreOptionsTiny } from "components/Icons";
import { Menu, MenuItem } from "components/Layout";

export const DocOptions = (props: {
  doc_id: string;
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
          onSelect={(e) => {
            props.setState("deleting");
          }}
        >
          <DeleteSmall />
          Delete Doc
        </MenuItem>
      </Menu>
    </>
  );
};
