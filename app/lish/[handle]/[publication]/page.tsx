import { IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

import { Sidebar } from "components/ActionBar/Sidebar";

import { Media } from "components/Media";
import { Footer } from "components/ActionBar/Footer";
import { PublicationDashboard } from "./PublicationDashboard";
import { DraftList } from "./DraftList";
import { NewDraftSecondaryButton } from "./NewDraftButton";
import { getIdentityData } from "actions/getIdentityData";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { Actions } from "./Actions";
import Link from "next/link";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";

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

//This is the admin dashboard of the publication
export default async function Publication(props: {
  params: Promise<{ publication: string; handle: string }>;
}) {
  let params = await props.params;
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return <PubNotFound />;
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return <PubNotFound />;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
      documents_in_publications(documents(*)),
      leaflets_in_publications(*,
        permission_tokens(*,
          permission_token_rights(*),
          custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*)
       )
      )`,
    )
    .eq("identity_did", did)
    .eq("name", decodeURIComponent((await props.params).publication))
    .single();
  if (!publication || identity.atp_did !== publication.identity_did)
    return <PubNotFound />;

  try {
    return (
      <ThemeProvider entityID={null}>
        <div className="relative max-w-prose w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6">
          <div className="w-12 relative">
            <Sidebar className="mt-6 p-2">
              <Actions publication={publication.uri} />
            </Sidebar>
          </div>
          <div
            className={`h-full overflow-y-scroll pt-4 px-3 sm:pl-8 sm:pr-1 sm:pt-9 w-full`}
          >
            <PublicationDashboard
              name={publication.name}
              tabs={{
                Drafts: (
                  <DraftList
                    publication={publication.uri}
                    drafts={publication.leaflets_in_publications.filter(
                      (p) => !p.doc,
                    )}
                  />
                ),
                Published: (
                  <div className="w-full container text-center place-items-center flex flex-col gap-3 p-3">
                    {publication.documents_in_publications.length === 0 ? (
                      <div className="italic text-tertiary">
                        Nothing's been published yet...
                      </div>
                    ) : (
                      publication.documents_in_publications.map((doc) => {
                        if (!doc.documents) return null;
                        let leaflet = publication.leaflets_in_publications.find(
                          (l) => doc.documents && l.doc === doc.documents.uri,
                        );
                        let uri = new AtUri(doc.documents.uri);
                        let record = doc.documents
                          .data as PubLeafletDocument.Record;
                        return (
                          <div
                            className="w-full flex flex-row justify-between"
                            key={doc.documents?.uri}
                          >
                            <Link
                              href={`/lish/${params.handle}/${params.publication}/${uri.rkey}`}
                            >
                              {record.title}
                            </Link>
                            {leaflet && (
                              <Link href={`/${leaflet.leaflet}`}>edit</Link>
                            )}
                          </div>
                        );
                      })
                    )}
                    <NewDraftSecondaryButton publication={publication.uri} />
                  </div>
                ),
              }}
              defaultTab={"Drafts"}
            />
          </div>
          <Media mobile>
            <Footer>
              <Actions publication={publication.uri} />
            </Footer>
          </Media>
        </div>
      </ThemeProvider>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return <div>ain't no pub here</div>;
};
