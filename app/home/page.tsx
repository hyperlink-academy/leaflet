import { AddTiny } from "components/Icons";
import { cookies } from "next/headers";
import { Fact, ReplicacheProvider } from "src/replicache";
import { createServerClient } from "@supabase/ssr";
import { Database } from "supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { createIdentity } from "actions/createIdentity";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { IdentitySetter } from "./IdentitySetter";
import { HomeHelp } from "./HomeHelp";
import { LeafletList } from "./LeafletList";
import { CreateNewLeafletButton } from "./CreateNewButton";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export default async function Home() {
  let cookieStore = cookies();
  let identity = cookieStore.get("identity")?.value;
  let needstosetcookie = false;
  if (!identity) {
    const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
    const db = drizzle(client);
    let newIdentity = await createIdentity(db);
    client.end();
    identity = newIdentity.id;
    needstosetcookie = true;
  }

  async function setCookie() {
    "use server";

    cookies().set("identity", identity as string, { sameSite: "strict" });
  }

  let res = await supabase
    .from("identities")
    .select(
      `*,
      permission_tokens!identities_home_page_fkey(*, permission_token_rights(*))
    `,
    )
    .eq("id", identity)
    .single();
  if (!res.data) return <div>{JSON.stringify(res.error)}</div>;
  if (!res.data.permission_tokens) return <div>no home page wierdly</div>;
  let { data } = await supabase.rpc("get_facts", {
    root: res.data.permission_tokens?.root_entity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  let root_entity = res.data.permission_tokens.root_entity;
  return (
    <ReplicacheProvider
      rootEntity={root_entity}
      token={res.data.permission_tokens}
      name={root_entity}
      initialFacts={initialFacts}
    >
      <IdentitySetter cb={setCookie} call={needstosetcookie} />
      <EntitySetProvider
        set={res.data.permission_tokens.permission_token_rights[0].entity_set}
      >
        <ThemeProvider entityID={root_entity}>
          <div className="flex h-full bg-bg-leaflet">
            <ThemeBackgroundProvider entityID={root_entity}>
              <div className="home relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col-reverse px-2 sm:px-6 ">
                <div className="homeOptions z-10 shrink-0 sm:static absolute bottom-0  place-self-end sm:place-self-start flex sm:flex-col flex-row-reverse gap-2 sm:w-fit w-full items-center pb-2 pt-1 sm:pt-7">
                  <CreateNewLeafletButton />
                  <HomeHelp />
                  <ThemePopover entityID={root_entity} home />
                </div>
                <LeafletList />
              </div>
            </ThemeBackgroundProvider>
          </div>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
