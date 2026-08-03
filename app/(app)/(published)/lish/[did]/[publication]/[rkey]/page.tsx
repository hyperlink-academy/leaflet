import { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentPageRenderer } from "./DocumentPageRenderer";
import { fetchPublicationForPage } from "../getPublicationForPage";
import { tryRenderPublicationPage } from "../tryRenderPublicationPage";
import { postPageMetadata } from "./postPageMetadata";
import { decodeQuotePosition } from "src/utils/quotePosition";

// On-demand ISR: rendered on first request, then served from the CDN and
// re-rendered in the background. The empty generateStaticParams is what opts a
// dynamic-params route into caching at all — `revalidate` alone leaves it
// fully dynamic. Writes invalidate eagerly — Leaflet's own actions in-process,
// firehose-indexed writes via /api/appview_revalidate — so the timer only
// backstops what nothing revalidates (Bluesky profiles, like/mention counts).
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  if (!decodeURIComponent(params.did)) return { title: "Publication 404" };

  return (
    (await postPageMetadata({
      did: params.did,
      publication: params.publication,
      segment: params.rkey,
    })) ?? { title: "404" }
  );
}
export default async function Post(props: {
  params: Promise<{
    publication: string;
    did: string;
    rkey: string;
    quote?: string;
  }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);

  if (!did) notFound();

  // A /<rkey> URL is either a published publication page or a post; render the
  // matching page, else fall back to the single-post renderer.
  const publication = await fetchPublicationForPage(did, publication_name);
  if (publication) {
    const pageRender = tryRenderPublicationPage({
      did,
      publication,
      path: "/" + rkey,
    });
    if (pageRender) return pageRender;
  }
  return (
    <DocumentPageRenderer
      did={did}
      rkey={rkey}
      publication={publication_name}
      openPageId={
        params.quote ? decodeQuotePosition(params.quote)?.pageId : undefined
      }
    />
  );
}
