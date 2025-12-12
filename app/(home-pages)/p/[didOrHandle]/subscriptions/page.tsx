import { idResolver } from "app/(home-pages)/reader/idResolver";
import { getSubscriptions } from "app/(home-pages)/reader/getSubscriptions";
import { ProfileSubscriptionsContent } from "./SubscriptionsContent";

export default async function ProfileSubscriptionsPage(props: {
  params: Promise<{ didOrHandle: string }>;
}) {
  const params = await props.params;
  const didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    const resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) return null;
    did = resolved;
  }

  const { subscriptions, nextCursor } = await getSubscriptions(did);

  return (
    <ProfileSubscriptionsContent
      did={did}
      subscriptions={subscriptions}
      nextCursor={nextCursor}
    />
  );
}
