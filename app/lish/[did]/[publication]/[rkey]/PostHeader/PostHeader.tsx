"use client";
import Link from "next/link";
import { PubLeafletDocument } from "lexicons/api";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { CollapsedPostHeader } from "./CollapsedPostHeader";
import { Interactions } from "../Interactions/Interactions";
import { PostPageData } from "../getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { useIdentityData } from "components/IdentityProvider";

export function PostHeader(props: {
  data: PostPageData;
  name: string;
  profile: ProfileViewDetailed;
}) {
  let { identity } = useIdentityData();
  let document = props.data;

  let record = document?.data as PubLeafletDocument.Record;
  let profile = props.profile;

  if (!document?.data || !document.documents_in_publications[0].publications)
    return;
  return (
    <>
      <CollapsedPostHeader
        title={record.title}
        quotes={document.document_mentions_in_bsky}
      />
      <div className="max-w-prose w-full mx-auto" id="post-header">
        <div className="pubHeader flex flex-col pb-5">
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
          <h2 className="">{record.title}</h2>
          {record.description ? (
            <p className="italic text-secondary">{record.description}</p>
          ) : null}

          <div className="text-sm text-tertiary pt-3 flex gap-1">
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
            <Interactions compact quotes={document.document_mentions_in_bsky} />
            {identity &&
              identity.atp_did ===
                document.documents_in_publications[0]?.publications
                  .identity_did && (
                <>
                  {" "}
                  |
                  <a
                    href={`https://leaflet.pub/${document.leaflets_in_publications[0].leaflet}`}
                  >
                    Edit Post
                  </a>
                </>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
