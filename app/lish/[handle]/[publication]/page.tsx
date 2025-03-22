import { ButtonPrimary } from "components/Buttons";
import { isSubscribed } from "../../LishHome";
import Link from "next/link";
import { Footer } from "../../Footer";
import { SubscribeButton, ShareButton } from "../../Subscribe";
import { PostList } from "../../PostList";
import { getPds, IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { getIdentityData } from "actions/getIdentityData";
import { AtUri } from "@atproto/syntax";
import {
  AtpBaseClient,
  PubLeafletDocument,
  PubLeafletPublication,
} from "lexicons/src";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { NewDraftButton } from "./NewDraftButton";
import { CallToActionAction } from "twilio/lib/rest/content/v1/content";
import { CallToActionButton } from "./CallToActionButton";

const idResolver = new IdResolver();

export default async function Publication(props: {
  params: { publication: string; handle: string };
}) {
  let did = await idResolver.handle.resolve(props.params.handle);
  if (!did) return <PubNotFound />;

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      "*, documents_in_publications(documents(*)), leaflets_in_publications(*, permission_tokens(*, permission_token_rights(*), custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*) ))",
    )
    .eq("identity_did", did)
    .eq("name", decodeURIComponent(props.params.publication))
    .single();
  if (!publication) return <PubNotFound />;

  let repo = await idResolver.did.resolve(did);
  if (!repo) return <PubNotFound />;
  const pds = getPds(repo);
  let agent = new AtpBaseClient((url, init) => {
    return fetch(new URL(url, pds), init);
  });

  try {
    let uri = new AtUri(publication.uri);
    let publication_record = await agent.pub.leaflet.publication.get({
      repo: props.params.handle,
      rkey: uri.rkey,
    });
    if (!PubLeafletPublication.isRecord(publication_record.value)) {
      return <pre>not a publication?</pre>;
    }

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
