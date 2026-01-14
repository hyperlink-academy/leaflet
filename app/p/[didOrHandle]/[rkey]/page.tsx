import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import { DocumentPageRenderer } from "app/lish/[did]/[publication]/[rkey]/DocumentPageRenderer";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { documentUriFilter } from "src/utils/uriHelpers";

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

  return {
    icons: {
      other: {
        rel: "alternate",
        url: document.uri,
      },
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
