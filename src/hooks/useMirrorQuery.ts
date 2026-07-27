import { DependencyList, useEffect, useState } from "react";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import {
  BlockStructureMirror,
  getBlockStructureMirror,
} from "src/replicache/blockMirror";
import { deepEquals } from "src/utils/deepEquals";

// Shared plumbing for hooks that render from the block-structure mirror. The
// mirror notifies on changes anywhere in the doc, not just the entity a
// consumer reads, so notifications touching none of `attributes` are skipped
// and deep-equal results keep their previous reference. Returns null until the
// store holds real data and the mirror has been populated, so callers can fall
// back to initialFacts.
//
// `attributes` and `compute` are not dependencies — pass anything they close
// over (e.g. the entityID) in `dependencies`.
export function useMirrorQuery<T>(
  attributes: readonly string[],
  compute: (mirror: BlockStructureMirror) => T,
  dependencies: DependencyList,
): T | null {
  let rep = useReplicache();
  // The sync engine sets "initialized" once the first pull lands; before that
  // the store is empty and callers should render the SSR facts. Read it
  // through a subscription rather than off the mirror's diff stream: a
  // subscription re-reads the store whenever the key is invalidated, so it
  // recovers on its own if a single watch diff ever misreports it, where a
  // flag derived from diffs would stay wrong until the next pull.
  let initialized = useSubscribe(
    rep.rep,
    async (tx) => !!(await tx.get("initialized")),
    { default: false },
  );
  let [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!rep.rep || !initialized) return;
    let mirror = getBlockStructureMirror(rep.rep);
    let update = (changed: ReadonlySet<string> | null) => {
      if (
        changed &&
        !changed.has("populated") &&
        !attributes.some((a) => changed.has(a))
      )
        return;
      if (!mirror.populated) return;
      setData((prev) => {
        let next = compute(mirror);
        return prev !== null && deepEquals(prev, next) ? prev : next;
      });
    };
    update(null);
    let unsubscribe = mirror.subscribe(update);
    return () => {
      unsubscribe();
      setData(null);
    };
  }, [rep.rep, initialized, ...dependencies]);
  return data;
}
