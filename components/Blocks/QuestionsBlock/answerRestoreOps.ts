import type { Fact } from "src/replicache";
import { Attributes, type Attribute } from "src/replicache/attributes";
import type { FactInput } from "src/replicache/mutations";
import {
  compensatingTextValue,
  stampedEncoding,
} from "src/versioning/textRestore";

type AnyFact = Fact<Attribute>;

// What it takes to turn an answer draft's facts back into the snapshot's.
export function answerRestoreOps(
  current: AnyFact[],
  snapshot: AnyFact[],
  answerEntity: string,
) {
  let entitiesOf = (facts: AnyFact[]) =>
    new Set(facts.map((f) => f.entity).filter((e) => e !== answerEntity));
  let snapshotEntities = entitiesOf(snapshot);
  let currentEntities = entitiesOf(current);
  let removeBlocks = current
    .filter((f) => f.entity === answerEntity && f.attribute === "card/block")
    .map((f) => (f.data as { value: string }).value)
    .filter((block) => !snapshotEntities.has(block));
  let removed = new Set(removeBlocks);

  let cardinalityOne = (f: AnyFact) =>
    Attributes[f.attribute]?.cardinality === "one";
  let currentById = new Map(current.map((f) => [f.id, f]));
  let currentByEA = new Map(
    current
      .filter(cardinalityOne)
      .map((f) => [`${f.entity}|${f.attribute}`, f]),
  );

  let matched = new Set<string>();
  let assert: FactInput[] = [];
  for (let sf of snapshot) {
    let attribute = Attributes[sf.attribute];
    if (!attribute) continue;
    let cur = cardinalityOne(sf)
      ? currentByEA.get(`${sf.entity}|${sf.attribute}`)
      : currentById.get(sf.id);
    let data = sf.data;
    if (cur) {
      matched.add(cur.id);
      if (
        cur.entity === sf.entity &&
        JSON.stringify(cur.data) === JSON.stringify(sf.data)
      )
        continue;
      // A yjs doc only ever merges, so going back takes an update that
      // rewrites the current doc rather than the older state itself.
      if (attribute.type === "text") {
        let value = restoredText(
          (cur.data as { value: string }).value,
          (sf.data as { value: string }).value,
        );
        if (value === null) continue;
        data = { type: "text", value } as AnyFact["data"];
      }
    }
    assert.push({
      id: sf.id,
      entity: sf.entity,
      attribute: sf.attribute,
      data,
    } as FactInput);
  }

  let retract = current
    .filter(
      (f) =>
        !matched.has(f.id) &&
        (f.entity === answerEntity
          ? !removed.has((f.data as { value: string }).value)
          : snapshotEntities.has(f.entity)),
    )
    .map((f) => f.id);

  return {
    createEntities: [...snapshotEntities].filter(
      (e) => !currentEntities.has(e),
    ),
    removeBlocks,
    retract,
    assert,
  };
}

function restoredText(current: string, snapshot: string) {
  try {
    return compensatingTextValue(current, snapshot);
  } catch {
    return stampedEncoding(snapshot);
  }
}
