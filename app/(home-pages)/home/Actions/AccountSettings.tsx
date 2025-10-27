"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { Menu, MenuItem } from "components/Layout";
import { mutate } from "swr";
import { AccountSmall } from "components/Icons/AccountSmall";
import { LogoutSmall } from "components/Icons/LogoutSmall";

// it was going have a popover with a log out button
export const AccountSettings = () => {
  return (
    <Menu
      asChild
      trigger={<ActionButton icon=<AccountSmall /> label="Settings" />}
    >
      <MenuItem
        onSelect={async () => {
          await fetch("/api/auth/logout");
          mutate("identity", null);
        }}
      >
        <LogoutSmall />
        Logout
      </MenuItem>
    </Menu>
  );
};
