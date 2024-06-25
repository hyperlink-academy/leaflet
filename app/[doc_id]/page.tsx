import { Fact, ReplicacheProvider } from "src/replicache";
import { Database } from "../../supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import { createServerClient } from "@supabase/ssr";
import { SelectionManager } from "components/SelectionManager";
import { Cards } from "components/Cards";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { MobileFooter } from "components/MobileFooter";
import { PopUpProvider } from "components/Toast";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export default async function DocumentPage(props: {
  params: { doc_id: string };
}) {
  let { data } = await supabase.rpc("get_facts", { root: props.params.doc_id });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  return (
    <ReplicacheProvider name={props.params.doc_id} initialFacts={initialFacts}>
      <PopUpProvider>
        <ThemeProvider entityID={props.params.doc_id}>
          <SelectionManager />
          <div
            className="pageContentWrapper w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full"
            id="card-carousel"
          >
            <Cards rootCard={props.params.doc_id} />
          </div>
          <MobileFooter entityID={props.params.doc_id} />
        </ThemeProvider>
      </PopUpProvider>
    </ReplicacheProvider>
  );
}
