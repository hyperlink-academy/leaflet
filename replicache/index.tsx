"use client";
import * as base64 from "base64-js";
import * as Y from "yjs";
import { createContext, useContext, useEffect, useState } from "react";
import { DeepReadonlyObject, Replicache, WriteTransaction } from "replicache";
import { Pull } from "./pull";
import { MutationContext, mutations } from "./mutations";
import { Attributes } from "./attributes";
import { Push } from "./push";
import { FactWithIndexes } from "./utils";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/database.types";

export type Fact<A extends keyof typeof Attributes> = {
  id: string;
  entity: string;
  attribute: A;
  data: Data<A>;
};

type Data<A extends keyof typeof Attributes> = {
  text: { type: "text"; value: string };
  reference: { type: "reference"; value: string };
}[(typeof Attributes)[A]["type"]];

let ReplicacheContext = createContext({
  rep: null as null | Replicache<ReplicacheMutators>,
});
export function useReplicache() {
  return useContext(ReplicacheContext);
}
type ReplicacheMutators = {
  [k in keyof typeof mutations]: (
    tx: WriteTransaction,
    args: Parameters<(typeof mutations)[k]>[0],
  ) => Promise<void>;
};
export function ReplicacheProvider(props: {
  name: string;
  children: React.ReactNode;
}) {
  let [rep, setRep] = useState<null | Replicache<ReplicacheMutators>>(null);
  useEffect(() => {
    let supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
    let newRep = new Replicache({
      mutators: Object.fromEntries(
        Object.keys(mutations).map((m) => {
          return [
            m,
            async (tx: WriteTransaction, args: any) => {
              await mutations[m as keyof typeof mutations](args, {
                async createEntity(_entityID) {
                  return true;
                },
                async assertFact(f) {
                  let attribute =
                    Attributes[f.attribute as keyof typeof Attributes];
                  if (!attribute) return;
                  let id = f.id || crypto.randomUUID();
                  let data = { ...f.data };
                  if (attribute.cardinality === "one") {
                    let existingFact = await tx
                      .scan<Fact<typeof f.attribute>>({
                        indexName: "eav",
                        prefix: `${f.entity}-${f.attribute}`,
                      })
                      .toArray();
                    if (existingFact[0]) {
                      id = existingFact[0].id;
                      if (attribute.type === "text") {
                        const oldUpdate = base64.toByteArray(
                          (
                            existingFact[0]?.data as Fact<
                              typeof f.attribute
                            >["data"]
                          ).value,
                        );
                        const newUpdate = base64.toByteArray(f.data.value);
                        const updateBytes = Y.mergeUpdatesV2([
                          oldUpdate,
                          newUpdate,
                        ]);
                        data.value = base64.fromByteArray(updateBytes);
                      }
                    }
                  }
                  await tx.set(id, FactWithIndexes({ id, ...f, data }));
                },
              } as MutationContext);
            },
          ];
        }),
      ) as ReplicacheMutators,
      licenseKey: "l381074b8d5224dabaef869802421225a",
      pusher: async (pushRequest) => {
        return {
          response: await Push(pushRequest, props.name),
          httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
        };
      },
      puller: async (pullRequest) => {
        return {
          response: await Pull(pullRequest, props.name),
          httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
        };
      },
      name: props.name,
      indexes: {
        eav: { jsonPointer: "/indexes/eav", allowEmpty: true },
        aev: { jsonPointer: "/indexes/aev", allowEmpty: true },
        vae: { jsonPointer: "/indexes/vae", allowEmpty: true },
      },
    });
    setRep(newRep);
    let channel = supabase.channel(`rootEntity:${props.name}`);

    channel.on("broadcast", { event: "poke" }, () => {
      newRep.pull();
    });
    channel.subscribe();
    return () => {
      newRep.close();
      setRep(null);
      channel.unsubscribe();
    };
  }, [props.name]);
  return (
    <ReplicacheContext.Provider value={{ rep }}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}

export function useEntity(entity: string, attribute: keyof typeof Attributes) {
  let [data, setData] = useState<
    null | DeepReadonlyObject<Fact<typeof attribute>>[]
  >(null);
  let { rep } = useReplicache();
  useEffect(() => {
    if (!rep) return;
    return rep.subscribe(
      (tx) => {
        return tx
          .scan<
            Fact<typeof attribute>
          >({ indexName: "eav", prefix: `${entity}-${attribute}` })
          .toArray();
      },
      { onData: setData },
    );
  }, [entity, attribute, rep]);
  return data;
}
