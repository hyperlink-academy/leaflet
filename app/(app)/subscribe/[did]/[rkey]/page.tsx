import { SubscribePage } from "app/(app)/lish/[did]/[publication]/subscribe/SubscribePage";

// Re-renders the canonical subscribe page (the publication route at
// /lish/[did]/[publication]/subscribe) addressed by did + rkey.
export default async function SubscribeByRkeyPage(props: {
  params: Promise<{ did: string; rkey: string }>;
}) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const rkey = decodeURIComponent(params.rkey);
  return <SubscribePage did={did} identifier={rkey} />;
}
