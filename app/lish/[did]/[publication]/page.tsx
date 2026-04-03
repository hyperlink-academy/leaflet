import { supabaseServerClient } from "supabase/serverClient";
import {
  getPublicationURL,
  getDocumentURL,
} from "app/lish/createPub/getPublicationURL";
import { BskyAgent } from "@atproto/api";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import React from "react";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { PublicationContent } from "./PublicationContent";

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  const did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  const agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  const publication_name = decodeURIComponent(params.publication);
  const [{ data: publications }, { data: profile }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select(
        `*,
        publication_subscriptions(*),
        documents_in_publications(documents(
          *,
          comments_on_documents(count),
          document_mentions_in_bsky(count),
          recommends_on_documents(count)
        ))
      `,
      )
      .eq("identity_did", did)
      .or(publicationNameOrUriFilter(did, publication_name))
      .order("uri", { ascending: false })
      .limit(1),
    agent.getProfile({ actor: did }),
  ]);
  const publication = publications?.[0];

  const record = normalizePublicationRecord(publication?.record);

  const showPageBackground = record?.theme?.showPageBackground;

  if (!publication) return <PubNotFound />;
  try {
    return (
      <>
        <PublicationContent
          record={record}
          publication={publication}
          did={did}
          profile={profile}
          showPageBackground={showPageBackground}
        />
      </>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can't find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
