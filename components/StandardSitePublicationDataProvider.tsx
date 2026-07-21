"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import type { StandardSitePublicationData } from "app/api/rpc/[command]/get_standard_site_publications";

type Resolver = (data: StandardSitePublicationData | null) => void;
let pendingURIs = new Set<string>();
let pendingResolvers = new Map<string, Resolver[]>();
let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(async () => {
    const uris = Array.from(pendingURIs);
    pendingURIs = new Set();
    const resolvers = pendingResolvers;
    pendingResolvers = new Map();
    flushScheduled = false;
    if (uris.length === 0) return;
    try {
      const res = await callRPC("get_standard_site_publications", { uris });
      const byUri = new Map(
        (res?.result.publications || []).map((p) => [p.uri, p] as const),
      );
      for (const uri of uris) {
        const pub = byUri.get(uri) ?? null;
        for (const r of resolvers.get(uri) || []) r(pub);
      }
    } catch {
      for (const uri of uris) {
        for (const r of resolvers.get(uri) || []) r(null);
      }
    }
  });
}

function batchFetchStandardSitePublication(
  uri: string,
): Promise<StandardSitePublicationData | null> {
  return new Promise((resolve) => {
    pendingURIs.add(uri);
    const existing = pendingResolvers.get(uri) || [];
    existing.push(resolve);
    pendingResolvers.set(uri, existing);
    scheduleFlush();
  });
}

const StandardSitePublicationDataContext = createContext<Record<
  string,
  StandardSitePublicationData
> | null>(null);

export function useStandardSitePublication(uri: string | null | undefined) {
  const ctx = useContext(StandardSitePublicationDataContext);
  const fromContext = uri ? ctx?.[uri] : undefined;
  const swr = useSWR<StandardSitePublicationData | null>(
    !uri || fromContext ? null : `standard-site-publication:${uri}`,
    () => batchFetchStandardSitePublication(uri!),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  return {
    data: fromContext ?? swr.data,
    isLoading: !fromContext && swr.isLoading,
  };
}
