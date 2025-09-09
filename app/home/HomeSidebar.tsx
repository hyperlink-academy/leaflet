"use client";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { CreateNewLeafletButton } from "./CreateNewButton";
import { HelpPopover } from "components/HelpPopover";
import { AccountSettings } from "./AccountSettings";
import { Sidebar } from "components/ActionBar/Sidebar";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";
import { LoginActionButton } from "components/LoginButton";
import { Navigation } from "components/ActionBar/Navigation";

export const HomeSidebar = () => {
  let { identity } = useIdentityData();
  let { rootEntity } = useReplicache();

  return (
    <div className="flex flex-col gap-4 my-6">
      <Navigation />
      <Sidebar alwaysOpen className="!w-full">
        <CreateNewLeafletButton />
        {identity ? <AccountSettings /> : <LoginActionButton />}
        <HelpPopover noShortcuts />
        <ThemePopover entityID={rootEntity} home />
      </Sidebar>
    </div>
  );
};
