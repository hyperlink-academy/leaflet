"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { AccountSmall, LogoutSmall } from "components/Icons";
import { Menu, MenuItem } from "components/Layout";
import { logout } from "actions/logout";
import { mutate } from "swr";

// it was going have a popover with a log out button
export const AccountSettings = () => {
  return (
    <Menu
      asChild
      trigger={<ActionButton icon=<AccountSmall /> label="Settings" />}
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
