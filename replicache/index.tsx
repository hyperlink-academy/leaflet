"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { DeepReadonlyObject, Replicache, WriteTransaction } from "replicache";
import { Pull } from "./pull";
import { mutations } from "./mutations";
import { Attributes } from "./attributes";
import { Push } from "./push";
import { FactWithIndexes } from "./utils";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/database.types";

export type Fact = {
  id: string;
  entity: string;
  attribute: keyof typeof Attributes;
  data: { type: "reference"; value: string } | { type: "text"; value: string };
};

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
                  if (attribute.cardinality === "one") {
                    let existingFact = await tx
                      .scan<Fact>({
                        indexName: "eav",
                        prefix: `${f.entity}-${f.attribute}`,
                      })
                      .toArray();
                    if (existingFact[0]) id = existingFact[0].id;
                  }
                  await tx.set(id, FactWithIndexes({ id, ...f }));
                },
              });
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
  }, []);
  return (
    <ReplicacheContext.Provider value={{ rep }}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}

export function useEntity(entity: string, attribute: string) {
  let [data, setData] = useState<null | DeepReadonlyObject<Fact>[]>(null);
  let { rep } = useReplicache();
  useEffect(() => {
    if (!rep) return;
    return rep.subscribe(
      (tx) => {
        return tx
          .scan<Fact>({ indexName: "eav", prefix: `${entity}-${attribute}` })
          .toArray();
      },
      { onData: setData },
    );
  }, [entity, attribute, rep]);
  return data;
}
