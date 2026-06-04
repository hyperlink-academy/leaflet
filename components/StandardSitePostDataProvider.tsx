"use client";
import { createContext, useContext } from "react";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";

type Resolver = (data: StandardSitePostData | null) => void;
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
      const res = await callRPC("get_standard_site_posts", { uris });
      const byUri = new Map(
        (res?.result.posts || []).map((p) => [p.uri, p] as const),
      );
      for (const uri of uris) {
        const post = byUri.get(uri) ?? null;
        for (const r of resolvers.get(uri) || []) r(post);
      }
    } catch {
      for (const uri of uris) {
        for (const r of resolvers.get(uri) || []) r(null);
      }
    }
  });
}

function batchFetchStandardSitePost(
  uri: string,
): Promise<StandardSitePostData | null> {
  return new Promise((resolve) => {
    pendingURIs.add(uri);
    const existing = pendingResolvers.get(uri) || [];
    existing.push(resolve);
    pendingResolvers.set(uri, existing);
    scheduleFlush();
  });
}

const StandardSitePostDataContext = createContext<Record<
  string,
  StandardSitePostData
> | null>(null);

export function useStandardSitePost(uri: string | null | undefined) {
  const ctx = useContext(StandardSitePostDataContext);
  const fromContext = uri ? ctx?.[uri] : undefined;
  const swr = useSWR<StandardSitePostData | null>(
    !uri || fromContext ? null : `standard-site-post:${uri}`,
    () => batchFetchStandardSitePost(uri!),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  return {
    data: fromContext ?? swr.data,
    isLoading: !fromContext && swr.isLoading,
  };
}
