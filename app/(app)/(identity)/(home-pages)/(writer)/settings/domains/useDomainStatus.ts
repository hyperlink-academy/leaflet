import useSWR, { mutate as mutateGlobal } from "swr";
import { callRPC } from "app/api/rpc/client";

export function useDomainStatus(domain: string) {
  let { data, mutate } = useSWR(`domain-status-${domain}`, async () => {
    return await callRPC("get_domain_status", { domain });
  });
  let pending = data?.config?.misconfigured || data?.verification;
  return { data, pending, mutate };
}

export function useDomainStatuses(domains: string[]) {
  let sorted = [...domains].sort();
  let { data } = useSWR(
    sorted.length ? `domain-statuses-${sorted.join(",")}` : null,
    async () => {
      let entries = await Promise.all(
        sorted.map(async (domain) => {
          let status = await callRPC("get_domain_status", { domain });
          mutateGlobal(`domain-status-${domain}`, status, {
            revalidate: false,
          });
          let pending = !!(
            status?.config?.misconfigured || status?.verification
          );
          return [domain, pending] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  );
  return data;
}
