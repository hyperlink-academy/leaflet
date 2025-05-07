"use client";
import { DependencyList, useEffect, useState } from "react";

export type Subscribable<Tx> = {
  subscribe<Data>(
    query: (tx: Tx) => Promise<Data>,
    options: {
      onData: (data: Data) => void;
      isEqual?: ((a: Data, b: Data) => boolean) | undefined;
    },
  ): () => void;
};

// We wrap all the callbacks in a `unstable_batchedUpdates` call to ensure that
// we do not render things more than once over all of the changed subscriptions.

let hasPendingCallback = false;
let callbacks: (() => void)[] = [];

function doCallback() {
  const cbs = callbacks;
  callbacks = [];
  hasPendingCallback = false;
  for (const callback of cbs) {
    callback();
  }
}

export type RemoveUndefined<T> = T extends undefined ? never : T;

export type UseSubscribeOptions<QueryRet, Default> = {
  /** Default can already be undefined since it is an unbounded type parameter. */
  default?: Default;
  dependencies?: DependencyList | undefined;
  isEqual?: ((a: QueryRet, b: QueryRet) => boolean) | undefined;
};

/**
 * Runs a query and returns the result. Re-runs automatically whenever the
 * query changes.
 *
 * NOTE: Changing `r` will cause the query to be re-run, but changing `query`
 * or `options` will not (by default). This is by design because these two
 * values are often object/array/function literals which change on every
 * render. If you want to re-run the query when these change, you can pass
 * them as dependencies.
 */
export function useSubscribe<Tx, QueryRet, Default = undefined>(
  r: Subscribable<Tx> | null | undefined,
  query: (tx: Tx) => Promise<QueryRet>,
  options: UseSubscribeOptions<QueryRet, Default> = {},
): RemoveUndefined<QueryRet> | Default {
  const { default: def, dependencies = [], isEqual } = options;
  const [snapshot, setSnapshot] = useState<QueryRet | undefined>(undefined);
  useEffect(() => {
    if (!r) {
      return;
    }

    const unsubscribe = r.subscribe(query, {
      onData: (data) => {
        // This is safe because we know that subscribe in fact can only return
        // `R` (the return type of query or def).
        callbacks.push(() => setSnapshot(data));
        if (!hasPendingCallback) {
          void Promise.resolve().then(doCallback);
          hasPendingCallback = true;
        }
      },
      isEqual,
    });

    return () => {
      unsubscribe();
      setSnapshot(undefined);
    };
  }, [r, ...dependencies]);
  if (snapshot === undefined) {
    return def as Default;
  }
  return snapshot as RemoveUndefined<QueryRet>;
}
