import { PubLeafletPublication } from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { AtUri } from "@atproto/syntax";

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

  let uri;
  let publication_name = decodeURIComponent(params.publication);
  if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
    uri = AtUri.make(
      did,
      "pub.leaflet.publication",
      publication_name,
    ).toString();
  }
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
        publication_subscriptions(*),
      documents_in_publications(documents(*))
      `,
    )
    .eq("identity_did", did)
    .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
    .single();
  if (!publication) return { title: "Publication 404" };

  let pubRecord = publication?.record as PubLeafletPublication.Record;

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
    alternates: pubRecord?.base_path
      ? {
          types: {
            "application/rss+xml": `https://${pubRecord?.base_path}/rss`,
            "application/atom+xml": `https://${pubRecord?.base_path}/atom`,
            "application/json": `https://${pubRecord?.base_path}/json`,
          },
        }
      : undefined,
  };
}
