import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";

export function useDomainStatus(domain: string) {
  let { data, mutate } = useSWR(`domain-status-${domain}`, async () => {
    return await callRPC("get_domain_status", { domain });
  });
  let pending = data?.config?.misconfigured || data?.verification;
  return { data, pending, mutate };
}
