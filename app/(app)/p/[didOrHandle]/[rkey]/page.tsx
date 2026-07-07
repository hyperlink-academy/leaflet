"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { docRouteTag } from "src/cacheTags";
import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { idResolver } from "src/identity";
import { DocumentPageRenderer } from "app/(app)/lish/[did]/[publication]/[rkey]/DocumentPageRenderer";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { documentUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";

export async function generateMetadata(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);
  cacheLife("hours");

  // Resolve handle to DID if necessary. Only a definitively-unresolved handle
  // is a 404; a thrown resolver error must propagate so an interrupted render
  // isn't captured as a not-found result.
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    let resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) return { title: "404" };
    did = resolved;
  }
  cacheTag(docRouteTag(did, params.rkey));

  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select("*")
    .or(documentUriFilter(did, params.rkey))
    .order("uri", { ascending: false })
    .limit(1);
  let document = documents?.[0];

  if (!document) return { title: "404" };

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return { title: "404" };

  // Canonical URL points at the document's blog domain (doc.site + path) so
  // the post on leaflet.pub (and its quote pages, which inherit this
  // metadata) doesn't compete with the custom-domain version in search.
  let docUrl = getDocumentURL(docRecord, document.uri);
  let canonical = docUrl.startsWith("http") ? docUrl : undefined;

  return {
    alternates: canonical ? { canonical } : undefined,
    icons: {
      other: [
        {
          rel: "alternate",
          url: document.uri,
        },
        { rel: "site.standard.document", url: document.uri },
      ],
    },
    title: docRecord.title,
    description: docRecord?.description || "",
  };
}

export default async function StandaloneDocumentPage(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);
  cacheLife("hours");

  // Resolve handle to DID if necessary. Only a definitively-unresolved handle
  // is a 404; a thrown resolver error must propagate so an interrupted render
  // isn't captured as a not-found result.
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    let resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) {
      return (
        <NotFoundLayout>
          <p className="font-bold">Sorry, we can't find this handle!</p>
          <p>
            This may be a glitch on our end. If the issue persists please{" "}
            <a href="mailto:contact@leaflet.pub">send us a note</a>.
          </p>
        </NotFoundLayout>
      );
    }
    did = resolved;
  }

  cacheTag(docRouteTag(did, params.rkey));
  return <DocumentPageRenderer did={did} rkey={params.rkey} />;
}
