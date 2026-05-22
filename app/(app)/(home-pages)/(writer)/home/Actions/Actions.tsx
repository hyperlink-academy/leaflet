"use client";
import { CreateNewLeafletButton } from "./CreateNewButton";
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
