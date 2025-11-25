import { AtUri } from "@atproto/syntax";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { PubLeafletPublication } from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import { PubNotFound } from "../PubNotFound";
import { getIdentityData } from "actions/getIdentityData";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { InvitedContent, NotInvitedContent, LoggedOutContent } from "./content";

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let identity = await getIdentityData();
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  let uri;
  let publication_name = decodeURIComponent(params.publication);
  if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
    uri = AtUri.make(
      did,
      "pub.leaflet.publication",
      publication_name,
    ).toString();
  }
  let [{ data: publication }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select(
        `*,
        publication_subscriptions(*),
        documents_in_publications(documents(
          *,
          comments_on_documents(count),
          document_mentions_in_bsky(count)
        ))
      `,
      )
      .eq("identity_did", did)
      .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
      .single(),
  ]);

  let pubRecord = publication?.record as PubLeafletPublication.Record;
  let showPageBackground = pubRecord?.theme?.showPageBackground;
  let pubUrl = getPublicationURL(publication!);
  let invited = false;

  if (!publication) return <PubNotFound />;

  return (
    <PublicationThemeProvider
      record={pubRecord}
      pub_creator={publication.identity_did}
    >
      <PublicationBackgroundProvider
        record={pubRecord}
        pub_creator={publication.identity_did}
      >
        <div className={`flex h-full place-items-center`}>
          <div
            className={`${showPageBackground ? "page-container" : ""} sm:mx-auto mx-3 max-w-sm w-full p-3 sm:p-4 flex flex-col justify-center text-center`}
          >
            {!identity || !identity?.atp_did ? (
              <LoggedOutContent
                pubRecord={pubRecord}
                uri={publication.uri}
                href={pubUrl}
              />
            ) : invited ? (
              <InvitedContent
                pubRecord={pubRecord}
                uri={publication.uri}
                href={pubUrl}
              />
            ) : (
              <NotInvitedContent
                pubRecord={pubRecord}
                uri={publication.uri}
                href={pubUrl}
              />
            )}
          </div>
        </div>
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}
