import { Metadata } from "next";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { fetchPublicationForPage } from "./getPublicationForPage";

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
  // Same fetcher the page body uses, so the two share one query.
  let publication = await fetchPublicationForPage(did, publication_name);
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
      other: [
        {
          rel: "alternate",
          url: publication.uri,
        },
        {
          rel: "site.standard.publication",
          url: publication.uri,
        },
      ],
    },
    alternates: pubRecord?.url
      ? {
          types: {
            "application/rss+xml": `${pubRecord.url}/rss`,
            "application/atom+xml": `${pubRecord.url}/atom`,
            "application/feed+json": `${pubRecord.url}/json`,
          },
        }
      : undefined,
    other: {
      "at:canonical": publication.uri,
    },
  };
}
