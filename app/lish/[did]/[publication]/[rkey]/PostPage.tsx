"use client";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { EditTiny } from "components/Icons/EditTiny";
import { Interactions, useInteractionState } from "./Interactions/Interactions";
import { PostContent } from "./PostContent";
import { PostHeader } from "./PostHeader/PostHeader";
import { useIdentityData } from "components/IdentityProvider";

export function PostPage({
  document,
  blocks,
  name,
  did,
  profile,
  pubRecord,
  prerenderedCodeBlocks,
}: {
  document: PostPageData;
  blocks: PubLeafletPagesLinearDocument.Block[];
  name: string;
  profile: ProfileViewDetailed;
  pubRecord: PubLeafletPublication.Record;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
}) {
  let { identity } = useIdentityData();
  let { drawerOpen } = useInteractionState();
  if (!document || !document.documents_in_publications[0].publications)
    return null;

  let hasPageBackground = !!pubRecord.theme?.showPageBackground;
  return (
    <>
      {drawerOpen && (
        <div
          className="spacer sm:block hidden"
          style={{ width: `calc(50vw - 24px - ((var(--page-width-units)/2))` }}
        />
      )}
      <div
        id="post-page"
        className={`relative h-full py-3 sm:py-6 overflow-y-auto
          ${!drawerOpen ? "w-full mx-auto" : "max-w-[var(--page-width-units)] shrink-0 snap-center"}
          ${
            hasPageBackground
              ? "overflow-auto h-full bg-[rgba(var(--bg-page),var(--bg-page-alpha))] rounded-lg border border-border"
              : "h-fit "
          }`}
      >
        <div className={`sm:max-w-prose mx-auto w-fit px-3`}>
          <PostHeader data={document} profile={profile} name={name} />
          <PostContent
            blocks={blocks}
            did={did}
            prerenderedCodeBlocks={prerenderedCodeBlocks}
          />
          <Interactions quotes={document.document_mentions_in_bsky} />
          <hr className="border-border-light mb-4 mt-4" />
          {identity &&
          identity.atp_did ===
            document.documents_in_publications[0]?.publications
              ?.identity_did ? (
            <a
              href={`https://leaflet.pub/${document.leaflets_in_publications[0].leaflet}`}
              className="flex gap-2 items-center hover:!no-underline selected-outline px-2 py-0.5 bg-accent-1 text-accent-2 font-bold w-fit rounded-lg !border-accent-1 !outline-accent-1 mx-auto"
            >
              <EditTiny /> Edit Post
            </a>
          ) : (
            <SubscribeWithBluesky
              isPost
              base_url={getPublicationURL(
                document.documents_in_publications[0].publications,
              )}
              pub_uri={document.documents_in_publications[0].publications.uri}
              subscribers={
                document.documents_in_publications[0].publications
                  .publication_subscriptions
              }
              pubName={name}
            />
          )}
        </div>
      </div>
    </>
  );
}
