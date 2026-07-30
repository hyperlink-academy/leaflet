import type { Metadata } from "next";
import { SubscribePage } from "./SubscribePage";

// On-demand ISR: rendered on first request, then served from the CDN and
// re-rendered in the background. The empty generateStaticParams is what opts a
// dynamic-params route into caching at all — `revalidate` alone leaves it
// fully dynamic. Writes invalidate eagerly via revalidatePublicationPaths.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export const metadata: Metadata = { robots: { index: false } };

export default async function PublicationSubscribePage(props: {
  params: Promise<{ did: string; publication: string }>;
}) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication = decodeURIComponent(params.publication);
  return <SubscribePage did={did} identifier={publication} />;
}
