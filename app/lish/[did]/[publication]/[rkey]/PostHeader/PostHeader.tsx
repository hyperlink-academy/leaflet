"use client";
import {
  PubLeafletComment,
  PubLeafletDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { Interactions } from "../Interactions/Interactions";
import { PostPageData } from "../getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { useIdentityData } from "components/IdentityProvider";
import { EditTiny } from "components/Icons/EditTiny";
import { SpeedyLink } from "components/SpeedyLink";
import { decodeQuotePosition } from "../quotePosition";
import { Separator } from "components/Layout";

export function PostHeader(props: {
  data: PostPageData;
  profile: ProfileViewDetailed;
  preferences: { showComments?: boolean };
}) {
  let { identity } = useIdentityData();
  let document = props.data;

  let record = document?.data as PubLeafletDocument.Record;
  let profile = props.profile;
  let pub = props.data?.documents_in_publications[0].publications;
  let pubRecord = pub?.record as PubLeafletPublication.Record;

  if (!document?.data || !document.documents_in_publications[0].publications)
    return;
  return (
    <div
      className="max-w-prose w-full mx-auto px-3 sm:px-4 sm:pt-3 pt-2"
      id="post-header"
    >
      <div className="pubHeader flex flex-col pb-5">
        <div className="flex justify-between w-full">
          <SpeedyLink
            className="font-bold hover:no-underline text-accent-contrast"
            href={
              document &&
              getPublicationURL(
                document.documents_in_publications[0].publications,
              )
            }
          >
            {pub?.name}
          </SpeedyLink>
          {identity &&
            identity.atp_did ===
              document.documents_in_publications[0]?.publications
                .identity_did &&
            document.leaflets_in_publications[0] && (
              <a
                className=" rounded-full  flex place-items-center"
                href={`https://leaflet.pub/${document.leaflets_in_publications[0].leaflet}`}
              >
                <EditTiny className="shrink-0" />
              </a>
            )}
        </div>
        <h2 className="">{record.title}</h2>
        {record.description ? (
          <p className="italic text-secondary">{record.description}</p>
        ) : null}

        <div className="text-sm text-tertiary pt-3 flex gap-2 items-center flex-wrap">
          {profile ? (
            <>
              <a
                className="text-tertiary"
                href={`https://bsky.app/profile/${profile.handle}`}
              >
                {profile.displayName || profile.handle}
              </a>
            </>
          ) : null}
          {record.publishedAt ? (
            <>
              <Separator classname="h-4" />

              <p>
                {new Date(record.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "2-digit",
                })}
              </p>
            </>
          ) : null}
          <Separator classname="h-4" />

          <Interactions
            showComments={props.preferences.showComments}
            compact
            quotesCount={
              document.document_mentions_in_bsky.filter((q) => {
                const url = new URL(q.link);
                const quoteParam = url.pathname.split("/l-quote/")[1];
                if (!quoteParam) return null;
                const quotePosition = decodeQuotePosition(quoteParam);
                return !quotePosition?.pageId;
              }).length
            }
            commentsCount={
              document.comments_on_documents.filter(
                (c) => !(c.record as PubLeafletComment.Record)?.onPage,
              ).length
            }
          />
        </div>
      </div>
    </div>
  );
}
