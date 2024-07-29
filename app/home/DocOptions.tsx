"use client";
import { PopoverArrow } from "components/Icons";
import { DeleteSmall, MoreOptionsTiny } from "components/Icons";
import * as Popover from "@radix-ui/react-popover";
import { Menu, MenuItem } from "components/Layout";
import { theme } from "tailwind.config";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";

export const DocOptions = (props: {
  doc_id: string;
  setState: (s: "normal" | "deleting") => void;
}) => {
  return (
    <>
      <div className="absolute -bottom-6 sm:bottom-1 right-1 ">
        <Popover.Root>
          <Popover.Trigger className="bg-accent-1  text-accent-2 px-2 py-1 border border-accent-2 rounded-md w-fit place-self-end ">
            <MoreOptionsTiny className=" " />
          </Popover.Trigger>
          <Popover.Anchor />
          <Popover.Portal>
            <Popover.Content align="end">
              <ThemeProvider entityID={props.doc_id} local>
                <Menu>
                  <MenuItem
                    onClick={(e) => {
                      props.setState("deleting");
                    }}
                  >
                    <DeleteSmall />
                    Delete Doc
                  </MenuItem>
                </Menu>
                <Popover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
                  <PopoverArrow
                    arrowFill={theme.colors["bg-card"]}
                    arrowStroke={theme.colors["border"]}
                  />
                </Popover.Arrow>
              </ThemeProvider>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </>
  );
};
