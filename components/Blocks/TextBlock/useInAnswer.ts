import { useEntity } from "src/replicache";

// Whether a block sits in a question's answer. Answers get a plain editor:
// no "/" block menu and no add-block buttons on empty lines, since the answer
// editor carries its own image and formatting buttons.
export function useInAnswer(parent: string | null) {
  return !!useEntity(parent, "answer/question");
}
