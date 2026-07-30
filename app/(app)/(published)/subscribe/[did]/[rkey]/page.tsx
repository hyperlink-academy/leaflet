import { SubscribePage } from "app/(app)/(published)/lish/[did]/[publication]/subscribe/SubscribePage";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { idResolver } from "src/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";

// On-demand ISR: rendered on first request, then served from the CDN and
// re-rendered in the background. The empty generateStaticParams is what opts a
// dynamic-params route into caching at all — `revalidate` alone leaves it
// fully dynamic. Writes invalidate eagerly via revalidatePublicationPaths.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

// The first path segment may be a DID or a handle — handles are resolved to
// a DID before looking up the publication. Memoized per request: the metadata
// and the page body resolve the same segment.
const resolveDid = cache(async function resolveDid(
  didOrHandle: string,
): Promise<string | null> {
  if (didOrHandle.startsWith("did:")) return didOrHandle;
  try {
    return (await idResolver.handle.resolve(didOrHandle)) ?? null;
  } catch (e) {
    return null;
  }
});

export async function generateMetadata(props: {
  params: Promise<{ did: string; rkey: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const did = await resolveDid(decodeURIComponent(params.did));
  const rkey = decodeURIComponent(params.rkey);
  if (!did) return { title: "Publication 404" };

  const { data: publications } = await supabaseServerClient
    .from("publications")
    .select("record")
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, rkey))
    .order("uri", { ascending: false })
    .limit(1);

  const record = normalizePublicationRecord(publications?.[0]?.record);
  if (!record) return { title: "Publication 404" };

  const title = `Subscribe to ${record.name || "Untitled Publication"}`;
  const description = record.description || "";
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

// Re-renders the canonical subscribe page (the publication route at
// /lish/[did]/[publication]/subscribe) addressed by did + rkey.
export default async function SubscribeByRkeyPage(props: {
  params: Promise<{ did: string; rkey: string }>;
}) {
  const params = await props.params;
  const rkey = decodeURIComponent(params.rkey);
  const didOrHandle = decodeURIComponent(params.did);
  const did = await resolveDid(didOrHandle);
  if (!did) notFound();
  // Canonicalize handle URLs onto the DID form so each publication has one
  // cache entry instead of one per handle spelling.
  if (didOrHandle !== did)
    redirect(`/subscribe/${encodeURIComponent(did)}/${params.rkey}`);

  return <SubscribePage did={did} identifier={rkey} />;
}
