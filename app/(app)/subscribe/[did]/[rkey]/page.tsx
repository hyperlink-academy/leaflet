import {
  SubscribePage,
  PubNotFound,
} from "app/(published)/lish/[did]/[publication]/subscribe/SubscribePage";
import { Metadata } from "next";
import { idResolver } from "src/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";

// The first path segment may be a DID or a handle — handles are resolved to
// a DID before looking up the publication.
async function resolveDid(didOrHandle: string): Promise<string | null> {
  if (didOrHandle.startsWith("did:")) return didOrHandle;
  try {
    return (await idResolver.handle.resolve(didOrHandle)) ?? null;
  } catch (e) {
    return null;
  }
}

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
  const did = await resolveDid(decodeURIComponent(params.did));
  if (!did) return <PubNotFound />;

  return <SubscribePage did={did} identifier={rkey} />;
}
