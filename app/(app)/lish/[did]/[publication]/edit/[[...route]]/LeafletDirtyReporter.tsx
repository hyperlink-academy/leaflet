"use client";
import { useEffect, useMemo, useRef } from "react";
import { Fact, useReplicache } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { useSubscribe } from "src/replicache/useSubscribe";
import { leafletToPublicationPageRecord } from "src/utils/leafletToPublicationPageRecord";
import {
  dirtyCheckHooks,
  deepEqual,
  normalizePageRecordForDiff,
} from "src/utils/publicationPageDiff";
import { usePublicationData } from "../../dashboard/PublicationSWRProvider";
import { useSetPublicationEditDirtyState } from "./dirtyContext";

const DEBOUNCE_MS = 500;

export function LeafletDirtyReporter(props: {
  leaflet_id: string;
  publication_uri: string;
  path: string;
  title: string;
}) {
  let { rep, initialFacts } = useReplicache();
  let setDirty = useSetPublicationEditDirtyState();
  let { data } = usePublicationData();
  let publishedRecord =
    data?.publication?.publication_pages?.find((p) => p.path === props.path)
      ?.record ?? null;

  let facts = useSubscribe(
    rep,
    async (tx) => {
      let initialized = await tx.get("initialized");
      if (!initialized) return null;
      return await tx
        .scan<Fact<Attribute>>({ indexName: "eav" })
        .toArray();
    },
    { default: null as Fact<Attribute>[] | null, dependencies: [] },
  );

  let effectiveFacts = facts ?? initialFacts;

  let normalizedPublished = useMemo(
    () => normalizePageRecordForDiff(publishedRecord as any),
    [publishedRecord],
  );

  let runIdRef = useRef(0);
  useEffect(() => {
    // No published record yet → there's something to publish.
    if (!publishedRecord) {
      setDirty("dirty");
      return;
    }

    let cancelled = false;
    let runId = ++runIdRef.current;
    let timer = window.setTimeout(async () => {
      try {
        let record = await leafletToPublicationPageRecord({
          facts: effectiveFacts,
          root_entity: props.leaflet_id,
          publication_uri: props.publication_uri,
          path: props.path,
          title: props.title,
          hooks: dirtyCheckHooks,
        });
        if (cancelled || runId !== runIdRef.current) return;
        let normalizedCurrent = normalizePageRecordForDiff(
          record as unknown as Record<string, unknown>,
        );
        setDirty(deepEqual(normalizedCurrent, normalizedPublished) ? "clean" : "dirty");
      } catch {
        if (cancelled || runId !== runIdRef.current) return;
        setDirty("dirty");
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    effectiveFacts,
    props.leaflet_id,
    props.publication_uri,
    props.path,
    props.title,
    publishedRecord,
    normalizedPublished,
    setDirty,
  ]);

  useEffect(() => {
    return () => setDirty("unknown");
  }, [setDirty]);

  return null;
}
