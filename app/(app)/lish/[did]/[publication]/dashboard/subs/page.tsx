import { Suspense } from "react";
import { SubsPageShell } from "../SubsPageShell";
import { SubscribersList } from "../SubscribersList";
import { SubscribersListSkeleton } from "../PublicationSubscribers";

export default async function SubsPage(props: {
  params: Promise<{ did: string; publication: string }>;
}) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication = decodeURIComponent(params.publication);

  return (
    <SubsPageShell>
      <Suspense fallback={<SubscribersListSkeleton />}>
        <SubscribersList did={did} publication={publication} />
      </Suspense>
    </SubsPageShell>
  );
}
