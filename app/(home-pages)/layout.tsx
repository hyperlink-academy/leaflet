import { getIdentityData } from "actions/getIdentityData";
import { EntitySetProvider } from "components/EntitySetProvider";
import {
  ThemeProvider,
  ThemeBackgroundProvider,
} from "components/ThemeManager/ThemeProvider";
import { ReplicacheProvider, type Fact } from "src/replicache";

export default async function HomePagesLayout(props: {
  children: React.ReactNode;
}) {
  let identityData = await getIdentityData();
  if (!identityData?.home_leaflet)
    return (
      <>
        <ThemeProvider entityID={""}>{props.children}</ThemeProvider>
      </>
    );
  let facts =
    (identityData?.home_leaflet?.permission_token_rights[0].entity_sets?.entities.flatMap(
      (e) => e.facts,
    ) || []) as Fact<any>[];

  let root_entity = identityData.home_leaflet.root_entity;
  return (
    <ReplicacheProvider
      rootEntity={identityData.home_leaflet.root_entity}
      token={identityData.home_leaflet}
      name={identityData.home_leaflet.root_entity}
      initialFacts={facts}
    >
      <EntitySetProvider
        set={identityData.home_leaflet.permission_token_rights[0].entity_set}
      >
        <ThemeProvider entityID={root_entity}>
          <ThemeBackgroundProvider entityID={root_entity}>
            {props.children}
          </ThemeBackgroundProvider>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
