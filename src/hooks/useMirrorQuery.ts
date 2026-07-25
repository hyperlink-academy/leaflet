import { DependencyList, useEffect, useState } from "react";
import { useReplicache } from "src/replicache";
import {
  BlockStructureMirror,
  getBlockStructureMirror,
} from "src/replicache/blockMirror";
import { deepEquals } from "src/utils/deepEquals";

// Shared plumbing for hooks that render from the block-structure mirror. The
// mirror notifies on changes anywhere in the doc, not just the entity a
// consumer reads, so notifications touching none of `attributes` are skipped
// and deep-equal results keep their previous reference. Returns null until
// the mirror is initialized so callers can fall back to initialFacts.
//
// `attributes` and `compute` are not dependencies — pass anything they close
// over (e.g. the entityID) in `dependencies`.
export function useMirrorQuery<T>(
  attributes: readonly string[],
  compute: (mirror: BlockStructureMirror) => T,
  dependencies: DependencyList,
): T | null {
  let rep = useReplicache();
  let [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!rep.rep) return;
    let mirror = getBlockStructureMirror(rep.rep);
    let update = (changed: ReadonlySet<string> | null) => {
      if (
        changed &&
        !changed.has("initialized") &&
        !attributes.some((a) => changed.has(a))
      )
        return;
      if (!mirror.initialized) return;
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
  }, [rep.rep, ...dependencies]);
  return data;
}
