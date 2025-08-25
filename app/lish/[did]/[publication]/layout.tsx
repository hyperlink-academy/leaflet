import { PubLeafletPublication } from "lexicons/api";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

export default async function PublicationLayout(props: {
  children: React.ReactNode;
}) {
  return <>{props.children}</>;
}

export async function generateMetadata(params: {
  did: string;
  publication: string;
}): Promise<Metadata> {
  if (!params.did || !params.publication) return { title: "Publication 404" };
  let { result: publication } = await get_publication_data.handler(
    {
      did: decodeURIComponent(params.did),
      publication_name: decodeURIComponent(params.publication),
    },
    { supabase: supabaseServerClient },
  );
  if (!publication) return { title: "Publication 404" };

  let pubRecord = publication?.record as PubLeafletPublication.Record;

  return {
    title: pubRecord?.name || "Untitled Publication",
    description: pubRecord?.description || "",
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
