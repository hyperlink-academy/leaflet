import { notFound, redirect } from "next/navigation";
import { decodeQuotePosition } from "src/utils/quotePosition";
import { DocumentPageRenderer } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/DocumentPageRenderer";
import { resolveDid } from "app/(app)/(published)/p/[didOrHandle]/resolveDid";
import { generateMetadata as postMetadata } from "app/(app)/(published)/p/[didOrHandle]/[rkey]/page";

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

// Quote-share URLs duplicate the post page; noindex so search engines don't
// flag them as duplicates of the canonical post.
export async function generateMetadata(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}) {
  return { ...(await postMetadata(props)), robots: { index: false } };
}
export default async function Post(props: {
  params: Promise<{ didOrHandle: string; rkey: string; quote: string }>;
}) {
  let params = await props.params;
  // Garbage quote params would each mint a permanent ISR entry.
  let quotePosition = decodeQuotePosition(decodeURIComponent(params.quote));
  if (!quotePosition) notFound();

  let didOrHandle = decodeURIComponent(params.didOrHandle);
  let did = await resolveDid(didOrHandle);
  if (!did) notFound();
  // Canonicalize handle URLs onto the DID form, matching the post page: the
  // two spellings are separate cache entries and only the DID one is what
  // publishing revalidates.
  if (didOrHandle !== did)
    redirect(
      `/p/${encodeURIComponent(did)}/${params.rkey}/l-quote/${params.quote}`,
    );

  return (
    <DocumentPageRenderer
      did={did}
      rkey={params.rkey}
      openPageId={quotePosition.pageId}
    />
  );
}
