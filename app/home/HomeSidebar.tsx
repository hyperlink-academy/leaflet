"use client";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { CreateNewLeafletButton } from "./CreateNewButton";
import { HelpPopover } from "components/HelpPopover";
import { AccountSettings } from "./AccountSettings";
import { Sidebar } from "components/ActionBar/Sidebar";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";
import { LoginActionButton } from "components/LoginButton";

export const HomeSidebar = () => {
  let { identity } = useIdentityData();
  let { rootEntity } = useReplicache();

  return (
    <Sidebar alwaysOpen className="mt-6">
      <CreateNewLeafletButton />
      {identity ? <AccountSettings /> : <LoginActionButton />}
      <HelpPopover noShortcuts />
      <ThemePopover entityID={rootEntity} home />
    </Sidebar>
  );
};
