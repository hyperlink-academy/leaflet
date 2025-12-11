import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import { PubLeafletDocument } from "lexicons/api";
import { Metadata } from "next";
import { DocumentPageRenderer } from "./DocumentPageRenderer";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return { title: "Publication 404" };

  let [{ data: document }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("*, documents_in_publications(publications(*))")
      .eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))
      .single(),
  ]);
  if (!document) return { title: "404" };

  let docRecord = document.data as PubLeafletDocument.Record;

  return {
    icons: {
      icon: {

        url:
          process.env.NODE_ENV === "development"
            ? `/lish/${did}/${params.publication}/icon`
            : "/icon",
        , sizes: "32x32", type: "image/png" },
      other: {
        rel: "alternate",
        url: document.uri,
      },
    },
    title:
      docRecord.title +
      " - " +
      document.documents_in_publications[0]?.publications?.name,
    description: docRecord?.description || "",
  };
}
export default async function Post(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);

  if (!did)
    return (
      <div className="p-4 text-lg text-center flex flex-col gap-4">
        <p>Sorry, can&apos;t resolve handle.</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </div>
    );

  return <DocumentPageRenderer did={did} rkey={params.rkey} />;
}
