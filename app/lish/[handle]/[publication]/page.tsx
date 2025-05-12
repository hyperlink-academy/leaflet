import { IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { ActionButton } from "components/ActionBar/ActionButton";
import { Sidebar } from "components/ActionBar/Sidebar";

import { Media } from "components/Media";
import { Footer } from "components/ActionBar/Footer";
import { PublicationDashboard } from "./PublicationDashboard";
import { AddTiny } from "components/Icons/AddTiny";

const idResolver = new IdResolver();

export async function generateMetadata(props: {
  params: Promise<{ publication: string; handle: string }>;
}): Promise<Metadata> {
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return { title: "Publication 404" };

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      "*, documents_in_publications(documents(*)), leaflets_in_publications(*, permission_tokens(*, permission_token_rights(*), custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*) ))",
    )
    .eq("identity_did", did)
    .eq("name", decodeURIComponent((await props.params).publication))
    .single();
  if (!publication) return { title: "404 Publication" };
  return { title: decodeURIComponent((await props.params).publication) };
}

export default async function Publication(props: {
  params: Promise<{ publication: string; handle: string }>;
}) {
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return <PubNotFound />;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      "*, documents_in_publications(documents(*)), leaflets_in_publications(*, permission_tokens(*, permission_token_rights(*), custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*) ))",
    )
    .eq("identity_did", did)
    .eq("name", decodeURIComponent((await props.params).publication))
    .single();
  if (!publication) return <PubNotFound />;

  let all_facts = await supabaseServerClient.rpc("get_facts_for_roots", {
    max_depth: 2,
    roots: publication.leaflets_in_publications.map(
      (l) => l.permission_tokens?.root_entity!,
    ),
  });
  let facts =
    all_facts.data?.reduce(
      (acc, fact) => {
        if (!acc[fact.root_id]) acc[fact.root_id] = [];
        acc[fact.root_id].push(
          fact as unknown as Fact<keyof typeof Attributes>,
        );
        return acc;
      },
      {} as { [key: string]: Fact<keyof typeof Attributes>[] },
    ) || {};

  try {
    return (
      <div className="relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6">
        <Sidebar className="mt-6">
          <ActionButton
            id="new-leaflet-button"
            primary
            icon=<AddTiny className="m-1 shrink-0" />
            label="Create Draft"
          />
        </Sidebar>
        <div className={`h-full overflow-y-scroll pl-8 pt-8 w-full`}>
          <PublicationDashboard name={publication.name} />
        </div>
        <Media mobile>
          <Footer>
            <ActionButton
              id="new-leaflet-button"
              primary
              icon=<AddTiny className="m-1 shrink-0" />
              label="New Doc"
            />
          </Footer>
        </Media>
      </div>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return <div>ain't no pub here</div>;
};

const Actions = () => {
  return (
    <>
      <ActionButton
        id="new-leaflet-button"
        primary
        icon=<AddTiny className="m-1 shrink-0" />
        label="Create Draft"
      />
    </>
  );
};
