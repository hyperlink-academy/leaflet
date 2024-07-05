import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import { Database } from "../../supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import { createServerClient } from "@supabase/ssr";
import { SelectionManager } from "components/SelectionManager";
import { Cards } from "components/Cards";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { MobileFooter } from "components/MobileFooter";
import { PopUpProvider } from "components/Toast";
import { YJSFragmentToString } from "components/TextBlock/RenderYJSFragment";
import {
  EntitySetContext,
  EntitySetProvider,
} from "components/EntitySetProvider";
import { UpdatePageTitle } from "components/utils/UpdatePageTitle";
export function Doc(props: {
  token: PermissionToken;
  initialFacts: Fact<keyof typeof Attributes>[];
  doc_id: string;
}) {
  return (
    <ReplicacheProvider
      rootEntity={props.doc_id}
      token={props.token}
      name={props.doc_id}
      initialFacts={props.initialFacts}
    >
      <EntitySetProvider
        set={props.token.permission_token_rights[0].entity_set}
      >
        <PopUpProvider>
          <ThemeProvider entityID={props.doc_id}>
            <UpdatePageTitle entityID={props.doc_id} />
            <SelectionManager />
            <div
              className="pageContentWrapper w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full"
              id="card-carousel"
            >
              <Cards rootCard={props.doc_id} />
            </div>
            <MobileFooter entityID={props.doc_id} />
          </ThemeProvider>
        </PopUpProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
