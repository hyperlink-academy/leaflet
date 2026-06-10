import {
  SubscribePage,
  PubNotFound,
} from "app/(app)/lish/[did]/[publication]/subscribe/SubscribePage";
import { idResolver } from "src/identity";

// Re-renders the canonical subscribe page (the publication route at
// /lish/[did]/[publication]/subscribe) addressed by did + rkey.
// The first path segment may be a DID or a handle — handles are resolved to
// a DID before looking up the publication.
export default async function SubscribeByRkeyPage(props: {
  params: Promise<{ did: string; rkey: string }>;
}) {
  const params = await props.params;
  const didOrHandle = decodeURIComponent(params.did);
  const rkey = decodeURIComponent(params.rkey);

  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    try {
      const resolved = await idResolver.handle.resolve(didOrHandle);
      if (!resolved) return <PubNotFound />;
      did = resolved;
    } catch (e) {
      return <PubNotFound />;
    }
  }

  return <SubscribePage did={did} identifier={rkey} />;
}
