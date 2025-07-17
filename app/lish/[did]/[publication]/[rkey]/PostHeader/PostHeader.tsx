import Link from "next/link";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import { PubLeafletDocument } from "lexicons/api";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { BskyAgent } from "@atproto/api";
import { CollapsedPostHeader } from "./CollapsedPostHeader";
import { Interactions } from "../Interactions/Interactions";
import { getIdentityData } from "actions/getIdentityData";
import { PostPageData } from "../getPostPageData";

export async function PostHeader(props: {
  data: PostPageData;
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let did = decodeURIComponent((await props.params).did);
  let identity = await getIdentityData();
  let agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  let document = props.data;
  let { data: profile } = await agent.getProfile({ actor: did });

  let record = document?.data as PubLeafletDocument.Record;

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
            {decodeURIComponent((await props.params).publication)}
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
