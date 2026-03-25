import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { idResolver } from "app/(home-pages)/reader/idResolver";

export type ProxyMentionSearchReturnType = Awaited<
  ReturnType<(typeof proxy_mention_search)["handler"]>
>;

async function resolveDidToServiceEndpoint(did: string): Promise<string> {
  const doc = await idResolver.did.resolve(did);
  if (!doc) throw new Error(`Could not resolve DID: ${did}`);
  const service = doc.service?.find(
    (s: any) => s.id === "#mention_search" || s.type === "MentionSearchService",
  );
  if (!service)
    throw new Error(`No mention search service in DID document for ${did}`);
  return service.serviceEndpoint as string;
}

export const proxy_mention_search = makeRoute({
  route: "proxy_mention_search",
  input: z.object({
    service_uri: z.string(),
    search: z.string(),
  }),
  handler: async (
    { service_uri, search },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    const { data: service } = await supabase
      .from("mention_services")
      .select("record")
      .eq("uri", service_uri)
      .single();

    if (!service) throw new Error("Mention service not found");

    const did = (service.record as any)?.did as string;
    if (!did) throw new Error("Service has no DID");

    const serviceEndpoint = await resolveDidToServiceEndpoint(did);

    const url = new URL(
      "/xrpc/parts.page.mention.searchService",
      serviceEndpoint,
    );
    url.searchParams.set("service", service_uri);
    url.searchParams.set("search", search);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Service returned ${response.status}`);
      }
      const data = (await response.json()) as { results?: unknown[] };
      const results = Array.isArray(data.results) ? data.results : [];

      return {
        result: {
          results: results.slice(0, 50).map((r: any) => ({
            uri: String(r.uri || ""),
            name: String(r.name || ""),
            href: r.href ? String(r.href) : undefined,
          })),
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});
