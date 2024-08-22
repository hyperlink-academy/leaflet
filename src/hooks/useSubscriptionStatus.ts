import { deleteSubscription } from "actions/subscriptions/deleteSubscription";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import useSWR, { mutate } from "swr";

type Subscription = { id: string; email: string; entity: string };
type SubscriptionStorage = {
  version: number;
  subscriptions: Array<Subscription>;
};

let defaultValue: SubscriptionStorage = {
  version: 1,
  subscriptions: [],
};

const key = "subscriptions-v1";
export function useSubscriptionStatus(entityID: string) {
  let params = useSearchParams();
  let sub_id = params.get("sub_id");
  useEffect(() => {
    if (!sub_id) return;
    let entity = params.get("entity");
    let email = params.get("email");
    if (!entity || !email) return;
    addSubscription({ id: sub_id, email: email, entity: entity });

    const url = new URL(window.location.href);
    url.searchParams.delete("sub_id");
    url.searchParams.delete("entity");
    url.searchParams.delete("email");
    window.history.replaceState({}, "", url.toString());
  }, [sub_id, params]);
  let { data: docs } = useSWR("subscriptions", () => getSubscriptions(), {});
  if (!docs) return null;
  return docs.find((d) => d.entity === entityID);
}

export function getSubscriptions() {
  let homepageDocs: SubscriptionStorage = JSON.parse(
    window.localStorage.getItem(key) || JSON.stringify(defaultValue),
  );
  return homepageDocs.subscriptions;
}

export function addSubscription(s: Subscription) {
  let subscriptions = getSubscriptions();
  if (subscriptions.find((d) => d.id === s.id)) return;
  subscriptions.push(s);
  let newValue: SubscriptionStorage = {
    version: 1,
    subscriptions: subscriptions,
  };
  window.localStorage.setItem(key, JSON.stringify(newValue));
  mutate("subscriptions", subscriptions, false);
}

export async function unsubscribe(s: Subscription) {
  let subscriptions = getSubscriptions();
  let newDocs = subscriptions.filter((d) => d.id !== s.id);
  let newValue: SubscriptionStorage = {
    version: 1,
    subscriptions: newDocs,
  };
  // Call the unsubscribe action
  await deleteSubscription(s.id);

  window.localStorage.setItem(key, JSON.stringify(newValue));
  mutate("subscriptions", newDocs, false);
}
