"use client";
import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { SelectionManager } from "components/SelectionManager";
import { Pages } from "components/Pages";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { LeafletFooter } from "./Footer";
import { EntitySetProvider } from "components/EntitySetProvider";
import { AddLeafletToHomepage } from "components/utils/AddLeafletToHomepage";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";
import { useUIState } from "src/useUIState";
import { LeafletLayout } from "components/LeafletLayout";

export function Leaflet(props: {
  token: PermissionToken;
  initialFacts: Fact<Attribute>[];
  leaflet_id: string;
}) {
  return (
    <ReplicacheProvider
      rootEntity={props.leaflet_id}
      token={props.token}
      name={props.leaflet_id}
      initialFacts={props.initialFacts}
    >
      <EntitySetProvider
        set={props.token.permission_token_rights[0].entity_set}
      >
        <ThemeProvider entityID={props.leaflet_id}>
          <ThemeBackgroundProvider entityID={props.leaflet_id}>
            <UpdateLeafletTitle entityID={props.leaflet_id} />
            <AddLeafletToHomepage />
            <SelectionManager />
            {/* we need the padding bottom here because if we don't have it the mobile footer will cut off...
            the dropshadow on the page... the padding is compensated by a negative top margin in mobile footer  */}
            <LeafletLayout className="!pb-[64px] sm:!pb-6">
              <Pages rootPage={props.leaflet_id} />
            </LeafletLayout>
            <LeafletFooter entityID={props.leaflet_id} />
          </ThemeBackgroundProvider>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
