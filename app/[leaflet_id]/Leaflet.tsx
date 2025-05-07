"use client";
import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { SelectionManager } from "components/SelectionManager";
import { Pages } from "components/Pages";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { MobileFooter } from "components/MobileFooter";
import { EntitySetProvider } from "components/EntitySetProvider";
import { AddLeafletToHomepage } from "components/utils/AddLeafletToHomepage";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";
import { useUIState } from "src/useUIState";
import { LeafletSidebar } from "./Sidebar";

export function Leaflet(props: {
  token: PermissionToken;
  initialFacts: Fact<keyof typeof Attributes>[];
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
            {/* we need the padding bottom here because if we don't have it the mobile footer will cut off
            the dropshadow on the page... the padding is compensated by a negative top margin in mobile footer  */}
            <div
              className="leafletContentWrapper w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full pb-4 pwa-padding"
              id="page-carousel"
            >
              <div
                id="pages"
                className="pages flex pt-2 pb-1 sm:pb-8 sm:py-6"
                onClick={(e) => {
                  e.currentTarget === e.target && blurPage();
                }}
              >
                <LeafletSidebar leaflet_id={props.leaflet_id} />
                <Pages rootPage={props.leaflet_id} />
              </div>
            </div>
            <MobileFooter entityID={props.leaflet_id} />
          </ThemeBackgroundProvider>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}

const blurPage = () => {
  useUIState.setState(() => ({
    focusedEntity: null,
    selectedBlocks: [],
  }));
};
