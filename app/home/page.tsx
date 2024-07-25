import { PaintSmall } from "components/Icons";
import { cookies } from "next/headers";
import { PermissionToken, ReplicacheProvider } from "src/replicache";
import { createServerClient } from "@supabase/ssr";
import { Database } from "supabase/database.types";
import { CardBlock, CardPreview } from "components/Blocks/CardBlock";
import Link from "next/link";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export default async function Home() {
  let cookieStore = cookies();
  let identity = cookieStore.get("identity");
  let docs: Array<PermissionToken & { root_entity: string }> = [];
  if (identity) {
    let res = await supabase
      .from("permission_token_creator")
      .select("*, permission_tokens(*, permission_token_rights(*))")
      .eq("identity", identity.value);
    if (res.data)
      docs = res.data.map((d) => d.permission_tokens).filter((d) => d !== null);
  }
  return (
    <div className=" bg-bg-page flex h-full">
      <div className="max-w-screen-lg w-full h-full mx-auto p-3 pb-6 sm:p-6 sm:pb-12 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between w-full items-center">
          <div>
            <PaintSmall />
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-m text-tertiary">sort: recent</div>
            <input
              className="w-full sm:w-72 bg-transparent border border-border rounded-md px-2 py-1 outline-none"
              placeholder="search"
            />
          </div>
        </div>
        {identity?.value}

        <div className="grid grid-cols-1 md:grid-cols-4 sm:grid-cols-3 gap-6">
          {docs.map((doc) => (
            <>
              <Doc key={doc.id} token={doc} doc_id={doc.root_entity} />
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

const Doc = (props: { token: PermissionToken; doc_id: string }) => {
  return (
    <ReplicacheProvider
      rootEntity={props.doc_id}
      token={props.token}
      name={props.doc_id}
      initialFacts={[]}
    >
      <Link
        href={"/" + props.token.id}
        className="doc flex flex-row sm:flex-col gap-3 sm:gap-1 grow basis-64  "
      >
        <CardPreview entityID={props.doc_id} />
        <div className="docDescription flex flex-col grow gap-0">
          <h4 className="line-clamp-3 sm:line-clamp-1"></h4>
          <p className="text-tertiary">6/2/2024</p>
        </div>
      </Link>
    </ReplicacheProvider>
  );
};
