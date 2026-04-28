"use client";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { CreateNewLeafletButton } from "./CreateNewButton";
import { HelpButton } from "app/[leaflet_id]/actions/HelpButton";
import { HomeThemeSetter } from "./HomeThemeSetter";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";

export const Actions = () => {
  let { identity } = useIdentityData();
  let { rootEntity } = useReplicache();
  return (
    <>
      <CreateNewLeafletButton />
      {identity && <HomeThemeSetter entityID={rootEntity} />}
    </>
  );
};
