import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { EditTiny } from "components/Icons/EditTiny";
import { useIdentityData } from "components/IdentityProvider";
import { PubLeafletComment } from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ExpandedInteractions } from "./Interactions/Interactions";
import { decodeQuotePosition } from "./quotePosition";

export const PostFooter = (props: {
  data: PostPageData;
  profile: ProfileViewDetailed;
  preferences: { showComments?: boolean };
}) => {
  let { identity } = useIdentityData();
  if (!props.data || !props.data.documents_in_publications[0].publications)
    return;
  return (
    <div className="flex flex-col px-3 sm:px-4">
      <ExpandedInteractions
        showComments={props.preferences.showComments}
        quotesCount={
          props.data.document_mentions_in_bsky.filter((q) => {
            const url = new URL(q.link);
            const quoteParam = url.pathname.split("/l-quote/")[1];
            if (!quoteParam) return null;
            const quotePosition = decodeQuotePosition(quoteParam);
            return !quotePosition?.pageId;
          }).length
        }
        commentsCount={
          props.data.comments_on_documents.filter(
            (c) => !(c.record as PubLeafletComment.Record)?.onPage,
          ).length
        }
      />
      {identity &&
      identity.atp_did ===
        props.data.documents_in_publications[0]?.publications?.identity_did ? (
        <a
          href={`https://leaflet.pub/${props.data.leaflets_in_publications[0]?.leaflet}`}
          className="flex gap-2 items-center hover:!no-underline selected-outline px-2 py-0.5 bg-accent-1 text-accent-2 font-bold w-fit rounded-lg !border-accent-1 !outline-accent-1 mx-auto"
        >
          <EditTiny /> Edit Post
        </a>
      ) : (
        <SubscribeWithBluesky
          isPost
          base_url={getPublicationURL(
            props.data.documents_in_publications[0].publications,
          )}
          pub_uri={props.data.documents_in_publications[0].publications.uri}
          subscribers={
            props.data.documents_in_publications[0].publications
              .publication_subscriptions
          }
          pubName={props.data.documents_in_publications[0].publications.name}
        />
      )}
    </div>
  );
};
