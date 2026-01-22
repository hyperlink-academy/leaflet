import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";

export default async function PublicationLayout(props: {
  children: React.ReactNode;
}) {
  return <>{props.children}</>;
}

export async function generateMetadata(props: {
  params: Promise<{
    did: string;
    publication: string;
  }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!params.did || !params.publication) return { title: "Publication 404" };

  let publication_name = decodeURIComponent(params.publication);
  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
        publication_subscriptions(*),
      documents_in_publications(documents(*))
      `,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  let publication = publications?.[0];
  if (!publication) return { title: "Publication 404" };

  const pubRecord = normalizePublicationRecord(publication?.record);

  return {
    title: pubRecord?.name || "Untitled Publication",
    description: pubRecord?.description || "",
    icons: {
      icon: {
        url:
          process.env.NODE_ENV === "development"
            ? `/lish/${did}/${publication_name}/icon`
            : "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      other: {
        rel: "alternate",
        url: publication.uri,
      },
    },
    alternates: pubRecord?.url
      ? {
          types: {
            "application/rss+xml": `${pubRecord.url}/rss`,
            "application/atom+xml": `${pubRecord.url}/atom`,
            "application/json": `${pubRecord.url}/json`,
          },
        }
      : undefined,
  };
}
