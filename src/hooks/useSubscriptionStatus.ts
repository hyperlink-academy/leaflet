import { deleteSubscription } from "actions/subscriptions/deleteSubscription";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import useSWR, { mutate } from "swr";

type Subscription = {
  id: string;
  email: string;
  entity: string;
  confirmed: boolean;
};
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
    //How do I get subscribed state here huh?
    addSubscription({
      id: sub_id,
      email: email,
      entity: entity,
      confirmed: true,
    });

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
  let newSubscriptions = subscriptions.filter((d) => d.id !== s.id);
  newSubscriptions.push(s);
  let newValue: SubscriptionStorage = {
    version: 1,
    subscriptions: newSubscriptions,
  };
  window.localStorage.setItem(key, JSON.stringify(newValue));
  mutate("subscriptions", newSubscriptions, false);
}

export function removeSubscription(s: Subscription) {
  let subscriptions = getSubscriptions();
  let newDocs = subscriptions.filter((d) => d.id !== s.id);
  let newValue: SubscriptionStorage = {
    version: 1,
    subscriptions: newDocs,
  };
  // Call the unsubscribe action

  window.localStorage.setItem(key, JSON.stringify(newValue));
  mutate("subscriptions", newDocs, false);
}

export async function unsubscribe(s: Subscription) {
  removeSubscription(s);
  await deleteSubscription(s.id);
}
