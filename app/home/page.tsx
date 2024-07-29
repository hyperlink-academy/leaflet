import { PaintSmall } from "components/Icons";
import { cookies } from "next/headers";
import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import { createServerClient } from "@supabase/ssr";
import { Database } from "supabase/database.types";
import { CardBlock, CardPreview } from "components/Blocks/CardBlock";
import Link from "next/link";
import { DocPreview } from "./DocPreview";
import { Attributes } from "src/replicache/attributes";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export default async function Home() {
  let cookieStore = cookies();
  let identity = cookieStore.get("identity");
  if (!identity) return <div>no identity</div>;
  let res = await supabase
    .from("identities")
    .select(
      `*,
      permission_tokens!identities_home_page_fkey(*, permission_token_rights(*)),
    permission_token_creator(
      *, permission_tokens(*, permission_token_rights(*))
    )
    `,
    )
    .eq("id", identity.value)
    .single();
  if (!res.data) return <div>{JSON.stringify(res.error)}</div>;
  let docs = res.data.permission_token_creator
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
      <EntitySetProvider
        set={res.data.permission_tokens.permission_token_rights[0].entity_set}
      >
        <ThemeProvider entityID={root_entity}>
          <div className="flex h-full">
            <div className="max-w-screen-lg w-full h-full mx-auto p-3 pb-6 sm:p-6 sm:pb-12 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row justify-between w-full items-center">
                <div>
                  <ThemePopover entityID={root_entity} />
                </div>
              </div>

              <div className="grid md:grid-cols-4 sm:grid-cols-3 grid-cols-2  gap-4 sm:gap-6">
                {docs.map((doc) => (
                  <ReplicacheProvider
                    rootEntity={doc.root_entity}
                    key={doc.id}
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
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
