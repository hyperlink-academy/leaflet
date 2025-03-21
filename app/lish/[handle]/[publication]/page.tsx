import { ButtonPrimary } from "components/Buttons";
import { ArrowRightTiny, MoreOptionsTiny, ShareSmall } from "components/Icons";
import { isSubscribed, isAuthor } from "../../LishHome";
import { Menu, MenuItem } from "components/Layout";
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

const idResolver = new IdResolver();

export default async function Publication(props: {
  params: { publication: string; handle: string };
}) {
  let did = await idResolver.handle.resolve(props.params.handle);
  if (!did) return <PubNotFound />;

  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("*, documents_in_publications(documents(*))")
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
          <div className="pubContent flex flex-col gap-8 px-4 py-6 mx-auto max-w-prose h-full overflow-scroll">
            <div
              id="pub-header"
              className="pubHeader flex flex-col gap-6 justify-center text-center"
            >
              <div className="flex flex-col gap-1">
                <h2>{publication.name}</h2>
                {/* <div className="pubDescription ">
                  We're making Leaflet, a fast fun web app for making delightful
                  documents. Sign up to follow along as we build Leaflet! We
                  send updates every week or two.
                </div> */}
              </div>
              {isAuthor ? (
                publication.documents_in_publications.length === 0 ? null : (
                  <div className="flex gap-2">
                    <ButtonPrimary>New Draft</ButtonPrimary>
                    {/* <ShareButton /> */}
                  </div>
                )
              ) : isSubscribed ? (
                <div className="flex gap-2">
                  <div className="font-bold">You're Subscribed!</div>
                  <ManageSubscriptionMenu />
                </div>
              ) : (
                <>
                  <SubscribeButton />
                </>
              )}
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

const ManageSubscriptionMenu = () => {
  return (
    <Menu trigger={<MoreOptionsTiny className="rotate-90" />}>
      <MenuItem onSelect={() => {}}>Unsub!</MenuItem>
    </Menu>
  );
};

const PubNotFound = () => {
  return <div>ain't no pub here</div>;
};
