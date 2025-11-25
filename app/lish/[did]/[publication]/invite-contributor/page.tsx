import { BskyAgent } from "@atproto/api";
import { AtUri } from "@atproto/syntax";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { PubLeafletPublication } from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import { ButtonPrimary } from "components/Buttons";
import { PubContributorEmptyIllo } from "../dashboard/publicationSettings/PublicationContributors";
import { PubNotFound } from "../PubNotFound";
import { PubIcon } from "components/ActionBar/Publications";
import { PubListing } from "app/(home-pages)/discover/PubListing";
import { SpeedyLink } from "components/SpeedyLink";
import { BlueskyLogin } from "app/login/LoginForm";
import { getIdentityData } from "actions/getIdentityData";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

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
                pubUrl={pubUrl}
              />
            ) : invited ? (
              <InvitedContent
                pubRecord={pubRecord}
                uri={publication.uri}
                pubUrl={pubUrl}
              />
            ) : (
              <NotInvitedContent
                pubRecord={pubRecord}
                uri={publication.uri}
                pubUrl={pubUrl}
              />
            )}
          </div>
        </div>
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}

const InvitedContent = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string;
  pubUrl: string;
}) => {
  return (
    <>
      <h2>Become a Contributor!</h2>
      <PubLink {...props} />
      <div>
        You've been invited to write for <br />
        {props.pubRecord.name}!{" "}
      </div>
      <ButtonPrimary className="mx-auto mt-4 mb-2">Accept Invite</ButtonPrimary>
    </>
  );
};

const NotInvitedContent = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string;
  pubUrl: string;
}) => {
  return (
    <>
      <h3 className="pb-2">You haven't been invited to contribute yet...</h3>
      <PubLink {...props} />

      <div>
        If you are expecting an invite, please check that the owner of this
        publication added you to the invited contributors list.
      </div>
    </>
  );
};

const LoggedOutContent = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string;
  pubUrl: string;
}) => {
  return (
    <>
      <h2>Log in to Contribute</h2>
      <PubLink {...props} />
      <div className="pb-2">
        Log in with an AT Proto handle to contribute this publication
      </div>
      <BlueskyLogin redirectRoute={`${props.pubUrl}/invite-contributor`} />
    </>
  );
};

const PubLink = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string;
  pubUrl: string;
}) => {
  return (
    <SpeedyLink
      href={props.pubUrl}
      className="p-4  flex flex-col justify-center text-center border border-border rounded-lg mt-2 mb-4 hover:no-underline! no-underline!"
    >
      <PubIcon
        large
        record={props.pubRecord}
        uri={props.uri}
        className="mx-auto mb-3 mt-1"
      />
      <h3 className="leading-tight">{props.pubRecord.name}</h3>
      <div className="text-tertiary italic">{props.pubRecord.description}</div>
    </SpeedyLink>
  );
};
