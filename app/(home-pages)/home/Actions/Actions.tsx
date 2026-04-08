"use client";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { CreateNewLeafletButton } from "./CreateNewButton";
import { HelpButton } from "app/[leaflet_id]/actions/HelpButton";
import { AccountSettings } from "./AccountSettings";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";

export const Actions = () => {
  let { identity } = useIdentityData();
  let { rootEntity } = useReplicache();
  return (
    <>
      <CreateNewLeafletButton />
      {identity && <AccountSettings entityID={rootEntity} />}
    </>
  );
};
