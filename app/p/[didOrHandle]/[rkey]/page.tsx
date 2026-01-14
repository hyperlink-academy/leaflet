import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import { Metadata } from "next";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import { DocumentPageRenderer } from "app/lish/[did]/[publication]/[rkey]/DocumentPageRenderer";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";

export async function generateMetadata(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    try {
      let resolved = await idResolver.handle.resolve(didOrHandle);
      if (resolved) did = resolved;
    } catch (e) {
      return { title: "404" };
    }
  }

  let { data: document } = await supabaseServerClient
    .from("documents")
    .select("*, documents_in_publications(publications(*))")
    .eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))
    .single();

  if (!document) return { title: "404" };

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return { title: "404" };

  // For documents in publications, include publication name
  let publicationName =
    document.documents_in_publications[0]?.publications?.name;

  return {
    icons: {
      other: {
        rel: "alternate",
        url: document.uri,
      },
    },
    title: publicationName
      ? `${docRecord.title} - ${publicationName}`
      : docRecord.title,
    description: docRecord?.description || "",
  };
}

export default async function StandaloneDocumentPage(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    try {
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
    } catch (e) {
      return (
        <NotFoundLayout>
          <p className="font-bold">Sorry, we can't find this leaflet!</p>
          <p>
            This may be a glitch on our end. If the issue persists please{" "}
            <a href="mailto:contact@leaflet.pub">send us a note</a>.
          </p>
        </NotFoundLayout>
      );
    }
  }

  return <DocumentPageRenderer did={did} rkey={params.rkey} />;
}
