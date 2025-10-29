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
import { useLocalizedDate } from "src/hooks/useLocalizedDate";

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

  const formattedDate = useLocalizedDate(
    record.publishedAt || new Date().toISOString(),
    {
      year: "numeric",
      month: "long",
      day: "2-digit",
    },
  );

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
        <div className="flex flex-row gap-0 sm:gap-2 pt-3 justify-between">
          <div className="text-sm text-tertiary flex gap-2 items-center ">
            {profile ? (
              <>
                <a
                  className="text-tertiary text-left"
                  href={`https://bsky.app/profile/${profile.handle}`}
                >
                  {props.profile.avatar && (
                    <img
                      className="rounded-full w-4 h-4"
                      src={props.profile.avatar}
                      alt={props.profile.displayName}
                    />
                  )}
                </a>
              </>
            ) : null}
            {record.publishedAt ? <p>{formattedDate}</p> : null}
          </div>

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
