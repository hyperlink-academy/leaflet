"use client";
import { useDocumentOptional } from "contexts/DocumentContext";
import { useIdentityData } from "components/IdentityProvider";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

export const PostSubscribe = () => {
  const data = useDocumentOptional();
  let { identity } = useIdentityData();

  let publication = data?.publication;
  let normalizedPublication = data?.normalizedPublication;

  let subscribed =
    identity?.atp_did &&
    publication?.publication_subscriptions &&
    publication?.publication_subscriptions.find(
      (s) => s.identity === identity.atp_did,
    );

  let isAuthor =
    identity &&
    identity.atp_did === publication?.identity_did &&
    data?.leafletId;

  if (!subscribed && !isAuthor && publication && normalizedPublication)
    return (
      <div className="text-center flex flex-col accent-container rounded-md mb-3 mx-3 sm:mx-4">
        <div className="flex flex-col py-4">
          <div className="leading-snug flex flex-col pb-2 ">
            <div className="font-bold">Subscribe to {publication.name}</div> to
            get updates in Reader, RSS, or via Bluesky Feed
          </div>
          <SubscribeWithBluesky
            pubName={publication.name}
            pub_uri={publication.uri}
            base_url={getPublicationURL(publication)}
            subscribers={publication?.publication_subscriptions}
          />
        </div>
      </div>
    );
  else return null;
};
