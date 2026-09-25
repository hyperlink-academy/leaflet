import { notFound } from "next/navigation";
import { decodeQuotePosition } from "src/utils/quotePosition";
import PostPage, {
  generateMetadata as postMetadata,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/page";

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

// Quote-share URLs duplicate the post page; the canonical inherited from the
// post's metadata consolidates them (and any links they earn) into the post.
export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  return await postMetadata(props);
}
export default async function Post(props: {
  params: Promise<{
    publication: string;
    did: string;
    rkey: string;
    quote: string;
  }>;
}) {
  // Garbage quote params would each mint a permanent ISR entry.
  if (!decodeQuotePosition(decodeURIComponent((await props.params).quote)))
    notFound();
  return <PostPage {...props} />;
}
