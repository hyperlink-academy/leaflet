"use client";
import { Footer } from "components/ActionBar/Footer";
import { Media } from "components/Media";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { CreateNewLeafletButton } from "./CreateNewButton";
import { HelpPopover } from "components/HelpPopover";
import { AccountSettings } from "./AccountSettings";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";
import { LoginActionButton } from "components/LoginButton";

export const HomeFooter = () => {
  let { identity } = useIdentityData();
  let { rootEntity } = useReplicache();
  return (
    <Media mobile>
      <Footer>
        <CreateNewLeafletButton />
        {identity ? <AccountSettings /> : <LoginActionButton />}
        <HelpPopover noShortcuts />
        <ThemePopover entityID={rootEntity} home />
      </Footer>
    </Media>
  );
};
