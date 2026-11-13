import type { ReadTransaction, Replicache } from "replicache";
import { v7 } from "uuid";
import type { Fact, ReplicacheMutators } from "src/replicache";
import { REFERENCE_TYPES, type Attribute } from "src/replicache/attributes";
import { scanIndex } from "src/replicache/utils";
import type { FactInput } from "src/replicache/mutations";
import { flushPendingTextWrites } from "components/Blocks/TextBlock/useCollabText";

type AnyFact = Fact<Attribute>;
type Rep = Replicache<ReplicacheMutators>;

// The answer's block list and everything under it. Page links aren't
// followed: a linked page isn't part of the answer.
async function answerDraftFacts(tx: ReadTransaction, answerEntity: string) {
  let scan = scanIndex(tx);
  let facts = [
    ...(await scan.eav(answerEntity, "card/block")),
  ] as unknown as AnyFact[];
  let seen = new Set([answerEntity]);
  let queue = facts.map((f) => (f.data as { value: string }).value);
  while (queue.length > 0) {
    let entity = queue.pop()!;
    if (seen.has(entity)) continue;
    seen.add(entity);
    for (let fact of (await scan.eav<Attribute>(
      entity,
      "",
    )) as unknown as AnyFact[]) {
      facts.push(fact);
      if (
        fact.attribute !== "block/card" &&
        REFERENCE_TYPES.has((fact.data as { type: string }).type)
      )
        queue.push((fact.data as { value: string }).value);
    }
  }
  return facts.map(({ id, entity, attribute, data }) => ({
    id,
    entity,
    attribute,
    data,
  })) as AnyFact[];
}

// Records the draft as the published answer's blocks. With `ifMissing`, an
// answer published before snapshots existed gets one the first time it's
// opened for editing.
export async function snapshotPublishedAnswer(
  rep: Rep,
  answerEntity: string,
  opts?: { ifMissing?: boolean },
) {
  await flushPendingTextWrites();
  let facts = await rep.query(async (tx) => {
    if (
      opts?.ifMissing &&
      (await scanIndex(tx).eav(answerEntity, "answer/published")).length > 0
    )
      return null;
    return answerDraftFacts(tx, answerEntity);
  });
  if (!facts) return;
  await rep.mutate.assertFact({
    entity: answerEntity,
    attribute: "answer/published",
    data: { type: "string", value: JSON.stringify(facts) },
    ignoreUndo: true,
  });
}

export async function revertAnswerToPublished(
  rep: Rep,
  answerEntity: string,
  permission_set: string,
) {
  await flushPendingTextWrites();
  let [saved] = await rep.query((tx) =>
    scanIndex(tx).eav(answerEntity, "answer/published"),
  );
  if (!saved) return false;
  let snapshot: AnyFact[];
  try {
    snapshot = JSON.parse(saved.data.value);
  } catch {
    return false;
  }
  // A yjs doc only ever merges, so the published text can't be written back
  // over a block's current text. The blocks are rebuilt as new entities
  // instead, where there is nothing to merge with.
  let entities = new Map<string, string>();
  for (let fact of snapshot)
    if (fact.entity !== answerEntity && !entities.has(fact.entity))
      entities.set(fact.entity, v7());
  let facts = snapshot.map((fact) => {
    let data = fact.data as { type: string; value: string };
    let target =
      fact.attribute !== "block/card" && REFERENCE_TYPES.has(data.type)
        ? entities.get(data.value)
        : undefined;
    return {
      id: v7(),
      entity: entities.get(fact.entity) ?? fact.entity,
      attribute: fact.attribute,
      data: target ? { ...data, value: target } : data,
    } as FactInput;
  });
  await rep.mutate.restoreQuestionAnswer({
    answerEntity,
    permission_set,
    entities: [...entities.values()],
    facts,
    ignoreUndo: true,
  });
  return true;
}
