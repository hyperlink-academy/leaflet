import { SubscribePage } from "./SubscribePage";

export default async function PublicationSubscribePage(props: {
  params: Promise<{ did: string; publication: string }>;
}) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication = decodeURIComponent(params.publication);
  return <SubscribePage did={did} identifier={publication} />;
}
