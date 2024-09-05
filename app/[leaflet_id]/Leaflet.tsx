import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import { Database } from "../../supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import { createServerClient } from "@supabase/ssr";
import { SelectionManager } from "components/SelectionManager";
import { Pages } from "components/Pages";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { MobileFooter } from "components/MobileFooter";
import { PopUpProvider } from "components/Toast";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
import {
  EntitySetContext,
  EntitySetProvider,
} from "components/EntitySetProvider";
import { AddLeafletToHomepage } from "components/utils/AddLeafletToHomepage";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";
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
        <PopUpProvider>
          <ThemeProvider entityID={props.leaflet_id}>
            <ThemeBackgroundProvider entityID={props.leaflet_id}>
              <UpdateLeafletTitle entityID={props.leaflet_id} />
              <AddLeafletToHomepage />
              <SelectionManager />
              <div
                className="leafletContentWrapper w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full"
                id="page-carousel"
              >
                <Pages rootPage={props.leaflet_id} />
              </div>
              <MobileFooter entityID={props.leaflet_id} />
            </ThemeBackgroundProvider>
          </ThemeProvider>
        </PopUpProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
