"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSubscribe } from "src/replicache/useSubscribe";
import {
  DeepReadonlyObject,
  PushRequest,
  PushRequestV1,
  Replicache,
  WriteTransaction,
} from "replicache";
import { mutations } from "./mutations";
import { Attributes } from "./attributes";
import { Attribute, Data, OrderedReferenceAttributes, ReferenceOrOrderedAttributes } from "./attributes";
import { clientMutationContext } from "./clientMutationContext";
import { supabaseBrowserClient } from "supabase/browserClient";
import { callRPC } from "app/api/rpc/client";
import { UndoManager } from "@rocicorp/undo";
import { addShortcut } from "src/shortcuts";
import { createUndoManager } from "src/undoManager";
import { RealtimeChannel } from "@supabase/supabase-js";

export type Fact<A extends Attribute> = {
  id: string;
  entity: string;
  attribute: A;
  data: Data<A>;
};

let ReplicacheContext = createContext({
  undoManager: createUndoManager(),
  rootEntity: "" as string,
  rep: null as null | Replicache<ReplicacheMutators>,
  initialFacts: [] as Fact<Attribute>[],
  permission_token: {} as PermissionToken,
});
export function useReplicache() {
  return useContext(ReplicacheContext);
}
export type ReplicacheMutators = {
  [k in keyof typeof mutations]: (
    tx: WriteTransaction,
    args: Parameters<(typeof mutations)[k]>[0],
  ) => Promise<void>;
};

export type PermissionToken = {
  id: string;
  root_entity: string;
  permission_token_rights: {
    created_at: string;
    entity_set: string;
    change_entity_set: boolean;
    create_token: boolean;
    token: string;
    read: boolean;
    write: boolean;
  }[];
};
export function ReplicacheProvider(props: {
  rootEntity: string;
  initialFacts: Fact<Attribute>[];
  token: PermissionToken;
  name: string;
  children: React.ReactNode;
  initialFactsOnly?: boolean;
  disablePull?: boolean;
}) {
  let [rep, setRep] = useState<null | Replicache<ReplicacheMutators>>(null);
  let [undoManager] = useState(createUndoManager());
  useEffect(() => {
    return addShortcut([
      {
        metaKey: true,
        key: "z",
        handler: () => {
          undoManager.undo();
        },
      },
      {
        metaKey: true,
        shift: true,
        key: "z",
        handler: () => {
          undoManager.redo();
        },
      },
      {
        metaKey: true,
        shift: true,
        key: "Z",
        handler: () => {
          undoManager.redo();
        },
      },
    ]);
  }, [undoManager]);
  useEffect(() => {
    if (props.initialFactsOnly) return;
    let supabase = supabaseBrowserClient();
    let newRep = new Replicache({
      pullInterval: props.disablePull ? null : undefined,
      pushDelay: 500,
      mutators: Object.fromEntries(
        Object.keys(mutations).map((m) => {
          return [
            m,
            async (tx: WriteTransaction, args: any) => {
              await mutations[m as keyof typeof mutations](
                args,
                clientMutationContext(tx, {
                  permission_token_id: props.token.id,
                  undoManager,
                  rep: newRep,
                  ignoreUndo: args.ignoreUndo || tx.reason !== "initial",
                  defaultEntitySet:
                    props.token.permission_token_rights[0]?.entity_set,
                }),
              );
            },
          ];
        }),
      ) as ReplicacheMutators,
      licenseKey: "l381074b8d5224dabaef869802421225a",
      pusher: async (pushRequest) => {
        const batchSize = 250;
        let smolpushRequest = {
          ...pushRequest,
          mutations: pushRequest.mutations.slice(0, batchSize),
        } as PushRequest;
        let response = (
          await callRPC("push", {
            pushRequest: smolpushRequest,
            token: props.token,
            rootEntity: props.name,
          })
        ).result;
        if (pushRequest.mutations.length > batchSize)
          setTimeout(() => {
            newRep.push();
          }, 50);
        return {
          response,
          httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
        };
      },
      puller: async (pullRequest) => {
        let res = await callRPC("pull", {
          pullRequest,
          token_id: props.token.id,
        });
        return {
          response: res,
          httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
        };
      },
      name: props.name,
      indexes: {
        eav: { jsonPointer: "/indexes/eav", allowEmpty: true },
        vae: { jsonPointer: "/indexes/vae", allowEmpty: true },
      },
    });

    setRep(newRep);
    let channel: RealtimeChannel | null = null;
    if (!props.disablePull) {
      channel = supabase.channel(`rootEntity:${props.name}`);

      channel.on("broadcast", { event: "poke" }, () => {
        newRep.pull();
      });
      channel.subscribe();
    }
    return () => {
      newRep.close();
      setRep(null);
      channel?.unsubscribe();
    };
  }, [props.name, props.initialFactsOnly, props.token, props.disablePull]);
  return (
    <ReplicacheContext.Provider
      value={{
        undoManager,
        rep,
        rootEntity: props.rootEntity,
        initialFacts: props.initialFacts,
        permission_token: props.token,
      }}
    >
      {props.children}
    </ReplicacheContext.Provider>
  );
}

type CardinalityResult<A extends Attribute> =
  (typeof Attributes)[A]["cardinality"] extends "one"
    ? DeepReadonlyObject<Fact<A>> | null
    : DeepReadonlyObject<Fact<A>>[];
export function useEntity<A extends Attribute>(
  entity: string | null,
  attribute: A,
): CardinalityResult<A> {
  let { rep, initialFacts } = useReplicache();
  let fallbackData = useMemo(
    () =>
      initialFacts.filter(
        (f) => f.entity === entity && f.attribute === attribute,
      ),
    [entity, attribute, initialFacts],
  );
  let data = useSubscribe(
    rep,
    async (tx) => {
      if (entity === null) return null;
      let initialized = await tx.get("initialized");
      if (!initialized) return null;
      return (
        (
          await tx
            .scan<Fact<A>>({
              indexName: "eav",
              prefix: `${entity}-${attribute}`,
            })
            // hack to handle rich bluesky-post type
            .toArray()
        ).filter((f) => f.attribute === attribute)
      );
    },
    {
      default: null,
      dependencies: [entity, attribute],
    },
  );
  let d = data || fallbackData;
  let a = Attributes[attribute];
  return a.cardinality === "many"
    ? ((a.type === "ordered-reference"
        ? d.sort((a, b) => {
            return (
              a as Fact<keyof OrderedReferenceAttributes>
            ).data.position >
              (b as Fact<keyof OrderedReferenceAttributes>)
                .data.position
              ? 1
              : -1;
          })
        : d) as CardinalityResult<A>)
    : d.length === 0 && data === null
      ? (null as CardinalityResult<A>)
      : (d[0] as CardinalityResult<A>);
}

export function useReferenceToEntity<
  A extends keyof ReferenceOrOrderedAttributes,
>(attribute: A, entity: string) {
  let { rep, initialFacts } = useReplicache();
  let fallbackData = useMemo(
    () =>
      initialFacts.filter(
        (f) =>
          (f as Fact<A>).data.value === entity && f.attribute === attribute,
      ),
    [entity, attribute, initialFacts],
  );
  let data = useSubscribe(
    rep,
    async (tx) => {
      if (entity === null) return null;
      let initialized = await tx.get("initialized");
      if (!initialized) return null;
      return (
        await tx
          .scan<Fact<A>>({ indexName: "vae", prefix: `${entity}-${attribute}` })
          .toArray()
      ).filter((f) => f.attribute === attribute);
    },
    {
      default: null,
      dependencies: [entity, attribute],
    },
  );
  return data || (fallbackData as Fact<A>[]);
}
