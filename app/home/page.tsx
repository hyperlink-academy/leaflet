import { AddTiny } from "components/Icons";
import { cookies } from "next/headers";
import { Fact, ReplicacheProvider } from "src/replicache";
import { createServerClient } from "@supabase/ssr";
import { Database } from "supabase/database.types";
import { DocPreview } from "./DocPreview";
import { Attributes } from "src/replicache/attributes";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { createNewDoc } from "actions/createNewDoc";
import { createIdentity } from "actions/createIdentity";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { IdentitySetter } from "./IdentitySetter";
import { HoverButton } from "components/Buttons";
import { HomeHelp } from "./HomeHelp";

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
      permission_tokens!identities_home_page_fkey(*, permission_token_rights(*)),
    permission_token_on_homepage(
      *, permission_tokens(*, permission_token_rights(*))
    )
    `,
    )
    .eq("id", identity)
    .single();
  if (!res.data) return <div>{JSON.stringify(res.error)}</div>;
  let docs = res.data.permission_token_on_homepage
    .map((d) => d.permission_tokens)
    .filter((d) => d !== null);
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
          <div className="flex h-full bg-bg-page">
            <ThemeBackgroundProvider entityID={root_entity}>
              <div className="home relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col-reverse sm:gap-4 px-2 sm:px-6 ">
                <div className="homeOptions z-10 shrink-0 sm:static absolute bottom-0  place-self-end sm:place-self-start flex sm:flex-col flex-row-reverse gap-2 sm:w-fit w-full items-center pb-2 pt-1 sm:pt-7">
                  <form action={createNewDoc}>
                    <button className="contents">
                      <HoverButton
                        icon=<AddTiny className="m-1 shrink-0" />
                        label="Create New"
                        background="bg-accent-1"
                        text="text-accent-2"
                      />
                    </button>
                  </form>
                  <HomeHelp />

                  <ThemePopover entityID={root_entity} home />
                </div>
                <div className="homeDocGrid grow w-full h-full overflow-y-scroll no-scrollbar pt-3 pb-28 sm:pt-6 sm:pb-12 ">
                  <div className="grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-8 gap-x-4 sm:gap-6 grow">
                    {docs.map((doc) => (
                      <ReplicacheProvider
                        key={doc.id}
                        rootEntity={doc.root_entity}
                        token={doc}
                        name={doc.root_entity}
                        initialFacts={[]}
                      >
                        <DocPreview token={doc} doc_id={doc.root_entity} />
                      </ReplicacheProvider>
                    ))}
                  </div>
                </div>
              </div>
            </ThemeBackgroundProvider>
          </div>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
