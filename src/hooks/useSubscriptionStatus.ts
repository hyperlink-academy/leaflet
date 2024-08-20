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
  }, [sub_id]);
  let { data: docs } = useSWR("subscriptions", () => getSubscriptions(), {
    fallbackData: [],
  });
  return docs.some((d) => d.entity === entityID);
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
