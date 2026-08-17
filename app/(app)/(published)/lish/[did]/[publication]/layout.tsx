import { Metadata } from "next";
import {
  isLeafletPublication,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { getPublicationURL } from "src/utils/getPublicationURL";
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
  // Legacy pub.leaflet publications without a configured domain don't
  // normalize (no URL), but they're still browsable at leaflet.pub/lish/…,
  // so title/description come from the raw record and feeds are advertised
  // there (same fallback as generateFeed).
  const rawRecord = isLeafletPublication(publication.record)
    ? publication.record
    : null;
  let feedBase = pubRecord?.url ?? getPublicationURL(publication);
  if (feedBase.startsWith("/")) feedBase = `https://leaflet.pub${feedBase}`;
  feedBase = feedBase.replace(/\/+$/, "");

  return {
    title:
      pubRecord?.name ||
      rawRecord?.name ||
      publication.name ||
      "Untitled Publication",
    description: pubRecord?.description || rawRecord?.description || undefined,
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
    alternates: {
      types: {
        "application/rss+xml": `${feedBase}/rss`,
        "application/atom+xml": `${feedBase}/atom`,
        "application/feed+json": `${feedBase}/json`,
      },
    },
    other: {
      "at:canonical": publication.uri,
    },
  };
}
