"use client";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { Subscribe } from "app/lish/Subscribe";
import { EditTiny } from "components/Icons/EditTiny";
import { Interactions, useInteractionState } from "./Interactions/Interactions";
import { PostContent } from "./PostContent";
import { PostHeader } from "./PostHeader/PostHeader";
import { useIdentityData } from "components/IdentityProvider";
import { AppBskyFeedDefs } from "@atproto/api";

export function PostPage({
  document,
  blocks,
  name,
  did,
  profile,
  pubRecord,
  prerenderedCodeBlocks,
  bskyPostData,
}: {
  document: PostPageData;
  blocks: PubLeafletPagesLinearDocument.Block[];
  name: string;
  profile: ProfileViewDetailed;
  pubRecord: PubLeafletPublication.Record;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
}) {
  let { identity } = useIdentityData();
  let { drawerOpen } = useInteractionState();
  if (!document || !document.documents_in_publications[0].publications)
    return null;

  let hasPageBackground = !!pubRecord.theme?.showPageBackground;
  return (
    <>
      {(drawerOpen || hasPageBackground) && (
        <div
          className="spacer sm:block hidden"
          style={{
            width: `calc(50vw - 12px - ((var(--page-width-units)/2))`,
          }}
        />
      )}
      <div
        id="post-page"
        className={`postPageWrapper relative overflow-y-auto sm:mx-0 mx-[6px] w-full
          ${drawerOpen || hasPageBackground ? "max-w-[var(--page-width-units)] shrink-0 snap-center " : "w-full"}
          ${
            hasPageBackground
              ? "h-full bg-[rgba(var(--bg-page),var(--bg-page-alpha))] rounded-lg border border-border "
              : "sm:h-[calc(100%+48px)] h-[calc(100%+24px)] sm:-my-6 -my-3  "
          }`}
      >
        <div
          className={`postPageContent sm:max-w-prose mx-auto h-fit w-full px-3 sm:px-4 ${hasPageBackground ? " pt-2 pb-3 sm:pb-6" : "py-6 sm:py-9"}`}
        >
          <PostHeader data={document} profile={profile} name={name} />
          <PostContent
            bskyPostData={bskyPostData}
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
            <Subscribe
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
