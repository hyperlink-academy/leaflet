import { cookies } from "next/headers";
import { Fact, ReplicacheProvider, useEntity } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { createIdentity } from "actions/createIdentity";
import { drizzle } from "drizzle-orm/node-postgres";
import { IdentitySetter } from "app/home/IdentitySetter";
import { getIdentityData } from "actions/getIdentityData";
import { getFactsFromHomeLeaflets } from "app/api/rpc/[command]/getFactsFromHomeLeaflets";
import { supabaseServerClient } from "supabase/serverClient";
import { pool } from "supabase/pool";

import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { ReaderContent } from "./ReaderContent";
import { SubscriptionsContent } from "./SubscriptionsContent";

export default async function Reader(props: {}) {
  let cookieStore = await cookies();
  let auth_res = await getIdentityData();
  let identity: string | undefined;
  if (auth_res) identity = auth_res.id;
  else identity = cookieStore.get("identity")?.value;
  let needstosetcookie = false;
  if (!identity) {
    const client = await pool.connect();
    const db = drizzle(client);
    let newIdentity = await createIdentity(db);
    client.release();
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

  if (!permission_token)
    return (
      <NotFoundLayout>
        <p className="font-bold">Sorry, we can't find this page!</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </NotFoundLayout>
    );
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
    (homeLeafletFacts.data as unknown as Fact<Attribute>[]) || [];
  let root_entity = permission_token.root_entity;

  if (!auth_res?.atp_did) return;
  let { data: publications } = await supabaseServerClient
    .from("publication_subscriptions")
    .select(`publications(*, documents_in_publications(documents(*)))`)
    .eq("identity", auth_res?.atp_did);

  let subbedPubs = publications?.map((pub) => {
    let subbedPubsArr: string[] = [];
    pub.publications?.name && subbedPubsArr.push(pub.publications?.name);
    return subbedPubsArr;
  });

  console.log(subbedPubs);

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
          <ThemeBackgroundProvider entityID={root_entity}>
            <DashboardLayout
              id="reader"
              cardBorderHidden={false}
              currentPage="discover"
              defaultTab="reader"
              actions={null}
              tabs={{
                reader: {
                  controls: <FocusToggle />,
                  content: <ReaderContent root_entity={root_entity} />,
                },
                subs: {
                  controls: null,
                  content: <SubscriptionsContent />,
                },
                discover: {
                  controls: null,
                  content: <></>,
                  href: "/discover",
                },
              }}
            />
          </ThemeBackgroundProvider>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}

const FocusToggle = () => {
  return <div className="grow flex justify-end">focus</div>;
};
