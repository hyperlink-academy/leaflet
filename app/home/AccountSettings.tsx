"use client";

import { HoverButton } from "components/Buttons";
import { AccountSmall, LogoutSmall } from "components/Icons";
import { Menu, MenuItem } from "components/Layout";
import { logout } from "actions/logout";
import { mutate } from "swr";

// it was going have a popover with a log out button
export const AccountSettings = () => {
  return (
    <Menu
      trigger={
        <HoverButton
          icon=<AccountSmall />
          label="Settings"
          noLabelOnMobile
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <MenuItem
        onSelect={async () => {
          await logout();
          mutate("identity");
        }}
      >
        <LogoutSmall />
        Logout
      </MenuItem>
    </Menu>
  );
};
