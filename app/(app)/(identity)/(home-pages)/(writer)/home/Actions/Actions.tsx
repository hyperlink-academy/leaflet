"use client";
import { CreateNewLeafletButton } from "./CreateNewButton";
import { HomeThemeSetter } from "./HomeThemeSetter";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";
import { TutorialNavTooltip } from "../Tutorial/TutorialNavTooltip";

export const Actions = () => {
  let { identity } = useIdentityData();
  let { rootEntity } = useReplicache();
  return (
    <>
      <TutorialNavTooltip target="new-doc">
        <CreateNewLeafletButton />
      </TutorialNavTooltip>
      {identity && <HomeThemeSetter entityID={rootEntity} />}
    </>
  );
};
