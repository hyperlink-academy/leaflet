import { cookies } from "next/headers";
import { Fact, ReplicacheProvider } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { createIdentity } from "actions/createIdentity";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { IdentitySetter } from "./IdentitySetter";
import { LeafletList } from "./LeafletList";
import { getIdentityData } from "actions/getIdentityData";
import { getFactsFromHomeLeaflets } from "app/api/rpc/[command]/getFactsFromHomeLeaflets";
import { HomeSidebar } from "./HomeSidebar";
import { HomeFooter } from "./HomeFooter";
import { Media } from "components/Media";
import { MyPublicationList } from "./Publications";
import { supabaseServerClient } from "supabase/serverClient";

export default async function Home() {
  let cookieStore = await cookies();

  let auth_token = cookieStore.get("auth_token")?.value;
  let auth_res = auth_token ? await getIdentityData() : null;
  let identity: string | undefined;
  if (auth_res) identity = auth_res.id;
  else identity = cookieStore.get("identity")?.value;
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

    (await cookies()).set("identity", identity as string, {
      sameSite: "strict",
    });
  }

  let permission_token = auth_res?.home_leaflet;
  if (!permission_token) {
    let res = await supabaseServerClient
      .from("identities")
      .select(
        `*,
        permission_tokens!identities_home_page_fkey(*, permission_token_rights(*))
      `,
      )
      .eq("id", identity)
      .single();
    permission_token = res.data?.permission_tokens;
  }

  if (!permission_token) return <div>no home page wierdly</div>;
  let [homeLeafletFacts, allLeafletFacts] = await Promise.all([
    supabaseServerClient.rpc("get_facts", {
      root: permission_token.root_entity,
    }),
    auth_res
      ? getFactsFromHomeLeaflets.handler(
          {
            tokens: auth_res.permission_token_on_homepage.map(
              (r) => r.permission_tokens.root_entity,
            ),
          },
          { supabase: supabaseServerClient },
        )
      : undefined,
  ]);
  let initialFacts =
    (homeLeafletFacts.data as unknown as Fact<keyof typeof Attributes>[]) || [];

  let root_entity = permission_token.root_entity;
  let home_docs_initialFacts = allLeafletFacts?.result || {};
  return (
    <ReplicacheProvider
      rootEntity={root_entity}
      token={permission_token}
      name={root_entity}
      initialFacts={initialFacts}
    >
      <IdentitySetter cb={setCookie} call={needstosetcookie} />
      <EntitySetProvider
        set={permission_token.permission_token_rights[0].entity_set}
      >
        <ThemeProvider entityID={root_entity}>
          <div className="homeWrapper flex h-full bg-bg-leaflet pwa-padding">
            <ThemeBackgroundProvider entityID={root_entity}>
              <div className="home relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6 ">
                <HomeSidebar />
                <div className={`h-full overflow-y-scroll`}>
                  <Media mobile>
                    <div className="pubListWrapper p-2 ">
                      <div className="pubList container p-3 ">
                        <MyPublicationList />
                      </div>
                    </div>
                  </Media>
                  <LeafletList initialFacts={home_docs_initialFacts} />
                </div>
                <HomeFooter />
              </div>
            </ThemeBackgroundProvider>
          </div>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
