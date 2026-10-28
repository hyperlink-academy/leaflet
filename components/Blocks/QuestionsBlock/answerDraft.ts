import { v5, v7 } from "uuid";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useEntity, useReplicache } from "src/replicache";

// A question's answer entity is named after it, so nothing has to be looked
// up to find the draft (or know there isn't one).
export function answerEntityFor(blockEntity: string, question: string) {
  return v5(question, blockEntity);
}

export function useHasAnswerDraft(blockEntity: string, question: string) {
  return !!useEntity(answerEntityFor(blockEntity, question), "answer/question");
}

export function useStartAnswer(blockEntity: string) {
  let { rep } = useReplicache();
  let { set } = useEntitySetContext();
  return (question: string) =>
    rep?.mutate.createQuestionAnswer({
      blockEntity,
      answerEntity: answerEntityFor(blockEntity, question),
      answerFactID: v5(`ref:${question}`, blockEntity),
      question,
      permission_set: set,
      firstBlockEntity: v7(),
      firstBlockFactID: v7(),
    });
}
