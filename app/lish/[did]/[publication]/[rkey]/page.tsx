import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { DocumentPageRenderer } from "./DocumentPageRenderer";
import { tryRenderPublicationPage } from "../tryRenderPublicationPage";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import {
  documentUriFilter,
  publicationNameOrUriFilter,
} from "src/utils/uriHelpers";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);
  if (!did) return { title: "Publication 404" };

  let { data: pubs } = await supabaseServerClient
    .from("publications")
    .select("name, publication_pages(path, title, record_uri)")
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  let matchingPage = pubs?.[0]?.publication_pages?.find(
    (p) => p.path === "/" + rkey && p.record_uri,
  );
  if (matchingPage) {
    return {
      title: `${matchingPage.title || matchingPage.path} - ${pubs?.[0]?.name}`,
    };
  }

  let [{ data: documents }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("*, documents_in_publications(publications(*))")
      .or(documentUriFilter(did, params.rkey))
      .order("uri", { ascending: false })
      .limit(1),
  ]);
  let document = documents?.[0];
  if (!document) return { title: "404" };

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return { title: "404" };

  return {
    icons: {
      icon: {
        url:
          process.env.NODE_ENV === "development"
            ? `/lish/${did}/${params.publication}/icon`
            : "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      other: [
        {
          rel: "alternate",
          url: document.uri,
        },
        { rel: "site.standard.document", url: document.uri },
      ],
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
  let publication_name = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);

  if (!did)
    return (
      <div className="p-4 text-lg text-center flex flex-col gap-4">
        <p className="font-bold">Sorry, we can&apos;t find that handle!</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </div>
    );

  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select(
      `uri, name, identity_did, record,
       publication_pages(id, path, title, record, record_uri),
       documents_in_publications(documents(uri, data,
         comments_on_documents(count),
         document_mentions_in_bsky(count),
         recommends_on_documents(count)))`,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  let publication = publications?.[0];

  if (publication) {
    const pageRender = tryRenderPublicationPage({
      did,
      publication,
      path: "/" + rkey,
    });
    if (pageRender) return pageRender;
  }

  return <DocumentPageRenderer did={did} rkey={rkey} />;
}
