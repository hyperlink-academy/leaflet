import type { ExperimentalNoIndexDiff, Replicache } from "replicache";
import type { Fact, ReplicacheMutators } from ".";
import type { Attribute } from "./attributes";

// The attributes getBlocks reads to assemble a page's block list. Mirroring
// only a small structural set keeps the mirror light and means block/text
// writes (every keystroke's debounced persist) never notify it.
export const blockListAttributes = [
  "card/block",
  "block/type",
  "block/is-list",
  "block/heading-level",
  "block/check-list",
  "block/list-style",
  "block/list-number",
] as const;

// usePageFootnotes additionally needs canvas ordering and per-block
// footnotes, and getPostImageEntities pages lightboxes through gallery
// children.
const mirroredAttributes = [
  ...blockListAttributes,
  "canvas/block",
  "block/footnote",
  "gallery/image",
] as const;
type MirroredAttribute = (typeof mirroredAttributes)[number];
const mirroredAttributeSet: Set<string> = new Set(mirroredAttributes);

function isMirroredFact(value: unknown): value is Fact<MirroredAttribute> {
  return (
    typeof value === "object" &&
    value !== null &&
    mirroredAttributeSet.has((value as Fact<Attribute>).attribute)
  );
}

// Listeners receive the set of mirrored attributes touched by a commit (plus
// the pseudo-key "populated" on the first diff) so each consumer can skip
// recomputing when nothing it reads changed — e.g. useBlocks ignores
// canvas/block position updates streaming in during a canvas drag.
type MirrorListener = (changed: ReadonlySet<string>) => void;

// An in-memory mirror of the block-structure facts in a Replicache instance,
// kept up to date via experimentalWatch. Assembling a page's block list from
// it is a handful of synchronous Map lookups per block — cheap enough to
// re-run on every structural mutation and to read one-shot in event handlers.
export class BlockStructureMirror {
  private byId = new Map<string, Fact<MirroredAttribute>>();
  private byEntityAttribute = new Map<string, Fact<MirroredAttribute>[]>();
  private listeners = new Set<MirrorListener>();
  private pendingChanged: Set<string> | null = null;
  // Whether the watch has delivered its first diff, which (with
  // initialValuesInFirstDiff) carries every key already in the store — so the
  // buckets are only trustworthy once this is true. Set by the arrival of a
  // diff, never derived from its contents, so a wrong diff can't unset it.
  // Whether the store itself holds real data is a separate question, answered
  // by the sync engine's "initialized" key — read from the store by consumers,
  // not tracked here.
  populated = false;

  constructor(rep: Replicache<ReplicacheMutators>) {
    rep.experimentalWatch((diff) => this.apply(diff), {
      initialValuesInFirstDiff: true,
    });
  }

  // Accepts any attribute so it satisfies getBlocks' SyncScan interface;
  // non-mirrored attributes are simply never present.
  eav<A extends Attribute>(entity: string, attribute: A): Fact<A>[] {
    return (this.byEntityAttribute.get(`${entity}-${attribute}`) ||
      []) as Fact<A>[];
  }

  subscribe(listener: MirrorListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private remove(id: string) {
    let old = this.byId.get(id);
    if (!old) return null;
    this.byId.delete(id);
    let key = `${old.entity}-${old.attribute}`;
    let bucket = this.byEntityAttribute.get(key);
    if (bucket) {
      let next = bucket.filter((f) => f.id !== id);
      if (next.length === 0) this.byEntityAttribute.delete(key);
      else this.byEntityAttribute.set(key, next);
    }
    return old;
  }

  private add(fact: Fact<MirroredAttribute>) {
    this.byId.set(fact.id, fact);
    let key = `${fact.entity}-${fact.attribute}`;
    let bucket = this.byEntityAttribute.get(key);
    if (bucket) bucket.push(fact);
    else this.byEntityAttribute.set(key, [fact]);
  }

  private apply(diff: ExperimentalNoIndexDiff) {
    let changed = new Set<string>();
    if (!this.populated) {
      this.populated = true;
      changed.add("populated");
    }
    for (let op of diff) {
      // A change can move a fact between buckets (e.g. moveChildren rewrites
      // a card/block fact onto a different parent), so treat it as del + add.
      if (op.op === "del" || op.op === "change") {
        let removed = this.remove(op.key);
        if (removed) changed.add(removed.attribute);
      }
      if (op.op === "add" || op.op === "change") {
        if (isMirroredFact(op.newValue)) {
          this.add(op.newValue);
          changed.add(op.newValue.attribute);
        }
      }
    }
    if (changed.size > 0) this.notify(changed);
  }

  // The maps above update synchronously in the watch callback (one-shot reads
  // like getPageBlocks depend on that), but listener notification is deferred
  // one macrotask. A single user action can commit several mutations
  // back-to-back (Enter on a list item: addBlock then moveChildren), and the
  // watch fires inside the awaited mutate() chain — notifying synchronously
  // would recompute every subscribed block list per commit on the mutation's
  // critical path and render the intermediate states. Deferring coalesces the
  // burst into one notification against the settled state.
  private notify(changed: Set<string>) {
    if (this.pendingChanged) {
      for (let attribute of changed) this.pendingChanged.add(attribute);
      return;
    }
    this.pendingChanged = changed;
    setTimeout(() => {
      let batch = this.pendingChanged!;
      this.pendingChanged = null;
      // Isolate listeners so one throwing doesn't skip the rest.
      for (let listener of this.listeners) {
        try {
          listener(batch);
        } catch (e) {
          console.error("BlockStructureMirror listener threw", e);
        }
      }
    }, 0);
  }
}

let mirrors = new WeakMap<
  Replicache<ReplicacheMutators>,
  BlockStructureMirror
>();
export function getBlockStructureMirror(rep: Replicache<ReplicacheMutators>) {
  let mirror = mirrors.get(rep);
  if (!mirror) {
    mirror = new BlockStructureMirror(rep);
    mirrors.set(rep, mirror);
  }
  return mirror;
}
