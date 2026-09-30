import useSWR, { mutate as mutateGlobal } from "swr";
import { callRPC } from "app/api/rpc/client";

export function useDomainStatus(domain: string) {
  let { data, mutate } = useSWR(`domain-status-${domain}`, async () => {
    return await callRPC("get_domain_status", { domain });
  });
  let pending = data?.config?.misconfigured || data?.verification;
  let ready = !!data && !data.error && !pending;
  return { data, pending, ready, mutate };
}

export type DomainReadiness = "ready" | "pending" | "error";

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
          let readiness: DomainReadiness =
            status?.config?.misconfigured || status?.verification
              ? "pending"
              : !status || status.error
                ? "error"
                : "ready";
          return [domain, readiness] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  );
  return data;
}
