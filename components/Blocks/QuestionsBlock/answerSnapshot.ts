import type { ReadTransaction, Replicache } from "replicache";
import type { Fact, ReplicacheMutators } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndex } from "src/replicache/utils";
import { flushPendingTextWrites } from "components/Blocks/TextBlock/useCollabText";
import { answerRestoreOps } from "./answerRestoreOps";

type AnyFact = Fact<Attribute>;
type Rep = Replicache<ReplicacheMutators>;

const REFERENCE_TYPES = new Set([
  "reference",
  "ordered-reference",
  "spatial-reference",
]);

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

// False when there is no snapshot to go back to.
export async function revertAnswerToPublished(
  rep: Rep,
  answerEntity: string,
  permission_set: string,
) {
  await flushPendingTextWrites();
  let state = await rep.query(async (tx) => {
    let [saved] = await scanIndex(tx).eav(answerEntity, "answer/published");
    if (!saved) return null;
    return {
      snapshot: saved.data.value,
      current: await answerDraftFacts(tx, answerEntity),
    };
  });
  if (!state) return false;
  let snapshot: AnyFact[];
  try {
    snapshot = JSON.parse(state.snapshot);
  } catch {
    return false;
  }
  await rep.mutate.restoreQuestionAnswer({
    permission_set,
    ...answerRestoreOps(state.current, snapshot, answerEntity),
  });
  return true;
}
