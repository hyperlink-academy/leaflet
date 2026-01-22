"use client";

import type { GetPublicationDataReturnType } from "app/api/rpc/[command]/get_publication_data";
import { callRPC } from "app/api/rpc/client";
import { createContext, useContext, useEffect, useMemo } from "react";
import useSWR, { SWRConfig, KeyedMutator, mutate } from "swr";
import { produce, Draft as ImmerDraft } from "immer";
import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

// Derive all types from the RPC return type
export type PublicationData = GetPublicationDataReturnType["result"];
export type PublishedDocument = NonNullable<PublicationData>["documents"][number];
export type PublicationDraft = NonNullable<PublicationData>["drafts"][number];

const PublicationContext = createContext({ name: "", did: "" });
export function PublicationSWRDataProvider(props: {
  publication_rkey: string;
  publication_did: string;
  publication_data: GetPublicationDataReturnType["result"];
  children: React.ReactNode;
}) {
  let key = `publication-data-${props.publication_did}-${props.publication_rkey}`;
  useEffect(() => {
    console.log("UPDATING");
    mutate(key, props.publication_data);
  }, [props.publication_data]);
  return (
    <PublicationContext
      value={{ name: props.publication_rkey, did: props.publication_did }}
    >
      <SWRConfig
        value={{
          fallback: {
            [key]: props.publication_data,
          },
        }}
      >
        {props.children}
      </SWRConfig>
    </PublicationContext>
  );
}

export function usePublicationData() {
  let { name, did } = useContext(PublicationContext);
  let key = `publication-data-${did}-${name}`;
  let { data, mutate } = useSWR(
    key,
    async () =>
      (await callRPC("get_publication_data", { publication_name: name, did }))
        ?.result,
  );
  return { data, mutate };
}

/**
 * Returns the normalized publication record from the publication data.
 * Use this instead of manually calling normalizePublicationRecord on data.publication.record
 */
export function useNormalizedPublicationRecord(): NormalizedPublication | null {
  const { data } = usePublicationData();
  return useMemo(
    () => normalizePublicationRecord(data?.publication?.record),
    [data?.publication?.record]
  );
}

export function mutatePublicationData(
  mutate: KeyedMutator<PublicationData>,
  recipe: (draft: ImmerDraft<NonNullable<PublicationData>>) => void,
) {
  mutate(
    (data) => {
      if (!data) return data;
      return produce(data, recipe);
    },
    { revalidate: false },
  );
}
