"use client";
import Link from "next/link";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { Interactions } from "../Interactions/Interactions";
import { PostPageData } from "../getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { useIdentityData } from "components/IdentityProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";
import { EditTiny } from "components/Icons/EditTiny";

export function PostHeader(props: {
  data: PostPageData;
  name: string;
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
    <>
      {/* <CollapsedPostHeader
        pubIcon={
          pubRecord?.icon && pub
            ? blobRefToSrc(pubRecord.icon.ref, new AtUri(pub.uri).host)
            : undefined
        }
        title={record.title}
        quotes={document.document_mentions_in_bsky}
      /> */}
      <div className="max-w-prose w-full mx-auto" id="post-header">
        <div className="pubHeader flex flex-col pb-5">
          <div className="flex justify-between w-full">
            <Link
              className="font-bold hover:no-underline text-accent-contrast"
              href={
                document &&
                getPublicationURL(
                  document.documents_in_publications[0].publications,
                )
              }
            >
              {props.name}
            </Link>
            {identity &&
              identity.atp_did ===
                document.documents_in_publications[0]?.publications
                  .identity_did && (
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

          <div className="text-sm text-tertiary pt-3 flex gap-1 flex-wrap">
            {profile ? (
              <>
                <a
                  className="text-tertiary"
                  href={`https://bsky.app/profile/${profile.handle}`}
                >
                  by {profile.displayName || profile.handle}
                </a>
              </>
            ) : null}
            {record.publishedAt ? (
              <>
                |
                <p>
                  {new Date(record.publishedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                  })}
                </p>
              </>
            ) : null}
            |{" "}
            <Interactions
              showComments={props.preferences.showComments}
              compact
              quotesCount={document.document_mentions_in_bsky.length}
              commentsCount={document.comments_on_documents.length}
            />
          </div>
        </div>
      </div>
    </>
  );
}
