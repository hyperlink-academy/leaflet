import { cookies } from "next/headers";
import { Fact, ReplicacheProvider } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";

import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { ReaderContent } from "./ReaderContent";
import { SubscriptionsContent } from "./SubscriptionsContent";
import { getReaderFeed } from "./getReaderFeed";

export default async function Reader(props: {}) {
  let cookieStore = await cookies();
  let auth_res = await getIdentityData();
  let identity: string | undefined;
  let permission_token = auth_res?.home_leaflet;
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
  let [homeLeafletFacts] = await Promise.all([
    supabaseServerClient.rpc("get_facts", {
      root: permission_token.root_entity,
    }),
  ]);
  let initialFacts =
    (homeLeafletFacts.data as unknown as Fact<Attribute>[]) || [];
  let root_entity = permission_token.root_entity;

  if (!auth_res?.atp_did) return;
  let posts = await getReaderFeed();
  let { data: pubs, error } = await supabaseServerClient
    .from("publication_subscriptions")
    .select(`publications(*, documents_in_publications(*, documents(*)))`)
    .order(`created_at`, { ascending: false })
    .order("indexed_at", {
      referencedTable: "publications.documents_in_publications",
    })
    .limit(1, { referencedTable: "publications.documents_in_publications" })
    .eq("identity", auth_res.atp_did);
  console.log(error);
  let publications =
    pubs
      ?.map((subscription) => subscription.publications)
      .filter((pub) => pub !== null) || [];
  return (
    <ReplicacheProvider
      rootEntity={root_entity}
      token={permission_token}
      name={root_entity}
      initialFacts={initialFacts}
    >
      <EntitySetProvider
        set={permission_token.permission_token_rights[0].entity_set}
      >
        <ThemeProvider entityID={root_entity}>
          <ThemeBackgroundProvider entityID={root_entity}>
            <DashboardLayout
              id="reader"
              cardBorderHidden={false}
              currentPage="reader"
              defaultTab="Read"
              actions={null}
              tabs={{
                Read: {
                  controls: null,
                  content: (
                    <ReaderContent
                      root_entity={root_entity}
                      posts={posts.posts}
                    />
                  ),
                },
                Subscriptions: {
                  controls: null,
                  content: <SubscriptionsContent publications={publications} />,
                },
              }}
            />
          </ThemeBackgroundProvider>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
