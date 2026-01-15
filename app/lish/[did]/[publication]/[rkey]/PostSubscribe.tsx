"use client";
import { useContext } from "react";
import { PostPageContext } from "./PostPageContext";
import { useIdentityData } from "components/IdentityProvider";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

export const PostSubscribe = () => {
  const data = useContext(PostPageContext);
  let { identity } = useIdentityData();

  let publication = data?.documents_in_publications[0]?.publications;

  let subscribed =
    identity?.atp_did &&
    publication?.publication_subscriptions &&
    publication?.publication_subscriptions.find(
      (s) => s.identity === identity.atp_did,
    );

  let isAuthor =
    identity &&
    identity.atp_did ===
      data?.documents_in_publications[0]?.publications?.identity_did &&
    data?.leaflets_in_publications[0];

  if (!subscribed && !isAuthor && publication && publication.record)
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
  else return;
};
