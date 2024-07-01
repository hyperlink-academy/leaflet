import { Fact, ReplicacheProvider } from "src/replicache";
import { Database } from "../../supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import { createServerClient } from "@supabase/ssr";
import { SelectionManager } from "components/SelectionManager";
import { Cards } from "components/Cards";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { MobileFooter } from "components/MobileFooter";
import { PopUpProvider } from "components/Toast";
import { YJSFragmentToString } from "components/TextBlock/RenderYJSFragment";
export function Doc(props: {
  initialFacts: Fact<keyof typeof Attributes>[];
  doc_id: string;
}) {
  return (
    <ReplicacheProvider name={props.doc_id} initialFacts={props.initialFacts}>
      <PopUpProvider>
        <ThemeProvider entityID={props.doc_id}>
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
    </ReplicacheProvider>
  );
}
