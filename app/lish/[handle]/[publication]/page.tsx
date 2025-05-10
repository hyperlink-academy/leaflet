import { Footer } from "../../Footer";
import { PostList } from "../../PostList";
import { getPds, IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { CallToActionButton } from "./CallToActionButton";
import { Metadata } from "next";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { DraftList } from "./DraftList";

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
      <div className="pubPage w-full h-screen bg-bg-leaflet flex items-stretch">
        <div className="pubWrapper flex flex-col w-full ">
          <div className="pubContent flex flex-col gap-8 px-4 py-6 mx-auto max-w-prose h-full w-full overflow-auto">
            <div
              id="pub-header"
              className="pubHeader flex flex-col gap-6 justify-center text-center"
            >
              <div className="flex flex-col gap-1 w-full place-items-center">
                <h2>{publication.name}</h2>
                <CallToActionButton />
              </div>
            </div>
            <DraftList
              drafts={publication.leaflets_in_publications.map((d) => ({
                ...d.permission_tokens!,
                initialFacts: facts[d.permission_tokens?.root_entity!],
              }))}
            />

            <PostList posts={publication.documents_in_publications} />
          </div>
          <Footer pageType="pub" />
        </div>
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
