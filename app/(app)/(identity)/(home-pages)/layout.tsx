import { Suspense } from "react";
import { getIdentityData } from "actions/getIdentityData";
import { EntitySetProvider } from "components/EntitySetProvider";
import { NavStateTracker } from "components/NavStateTracker";
import { FullPageLoading } from "components/PageLayouts/DashboardLoading";
import {
  ThemeProvider,
  ThemeBackgroundProvider,
} from "components/ThemeManager/ThemeProvider";
import { ReplicacheProvider, type Fact } from "src/replicache";

// Synchronous shell + suspended inner, same as the (identity) layout above:
// navigations that mount this segment fresh (e.g. editor → home) suspend
// inside the already-committed (identity) boundary, which won't re-show its
// fallback mid-transition — so this segment needs its own boundary to commit
// against while getIdentityData resolves.
export default function HomePagesLayout(props: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <HomePagesLayoutInner>{props.children}</HomePagesLayoutInner>
    </Suspense>
  );
}

async function HomePagesLayoutInner(props: { children: React.ReactNode }) {
  let identityData = await getIdentityData();
  if (!identityData?.home_leaflet)
    return (
      <>
        <NavStateTracker />
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
            <NavStateTracker />
            {props.children}
          </ThemeBackgroundProvider>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
