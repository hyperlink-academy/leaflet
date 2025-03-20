import {
  AtpBaseClient,
  PubLeafletDocument,
  PubLeafletPublication,
} from "lexicons/src";

import { getPds, IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { getIdentityData } from "actions/getIdentityData";
import { AtUri } from "@atproto/syntax";
import Link from "next/link";

const idResolver = new IdResolver();
export default async function RecordPage(props: {
  params: { publication: string; handle: string };
}) {
  let identity = await getIdentityData();
  let did = await idResolver.handle.resolve(props.params.handle);
  if (!did) return <div> can't resolve handle</div>;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("*, documents_in_publications(documents(*))")
    .eq("identity_did", did)
    .eq("name", decodeURIComponent(props.params.publication))
    .single();
  if (!publication)
    return <div>publication {props.params.publication} not found</div>;

  let repo = await idResolver.did.resolve(did);
  if (!repo) return <div>can't resolve did</div>;
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
      <div>
        <h1>{publication.name}</h1>
        <pre>{JSON.stringify(publication_record, undefined, 2)}</pre>
        <h2>Posts</h2>
        {publication.documents_in_publications.map((p) => {
          let d = p.documents?.data as PubLeafletDocument.Record;
          let uri = new AtUri(p.documents?.uri!);
          return (
            <Link
              key={p.documents?.uri}
              href={`/bsky-test/${props.params.handle}/${props.params.publication}/${uri.rkey}
`}
            >
              {d.title}
            </Link>
          );
        })}
      </div>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}
