"use client";
import { DeleteSmall, MoreOptionsTiny } from "components/Icons";
import * as Popover from "@radix-ui/react-popover";
import { Menu, MenuItem } from "components/Layout";

export const DocOptions = (props: { doc_id: string }) => {
  return (
    <>
      <Popover.Root>
        <Popover.Trigger className="absolute -bottom-5 sm:bottom-1 right-1 bg-accent-1  text-accent-2 px-2 py-1 border border-accent-2 rounded-md w-fit place-self-end ">
          <MoreOptionsTiny className=" " />
        </Popover.Trigger>
        <Popover.Anchor />
        <Popover.Portal>
          <Popover.Content align="end">
            <Menu>
              <MenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <DeleteSmall />
                Delete Doc
              </MenuItem>
            </Menu>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};
