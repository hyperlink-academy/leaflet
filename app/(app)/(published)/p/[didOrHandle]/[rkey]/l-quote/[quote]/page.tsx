import { notFound } from "next/navigation";
import { decodeQuotePosition } from "src/utils/quotePosition";
import PostPage from "app/(app)/(published)/p/[didOrHandle]/[rkey]/page";

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

export { generateMetadata } from "app/(app)/(published)/p/[didOrHandle]/[rkey]/page";
export default async function Post(props: {
  params: Promise<{ didOrHandle: string; rkey: string; quote: string }>;
}) {
  // Garbage quote params would each mint a permanent ISR entry.
  if (!decodeQuotePosition(decodeURIComponent((await props.params).quote)))
    notFound();
  return <PostPage {...props} />;
}
