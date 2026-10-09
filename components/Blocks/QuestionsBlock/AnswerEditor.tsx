"use client";
import { useEffect, useState } from "react";
import { v5, v7 } from "uuid";
import { Blocks } from "components/Blocks";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useToaster } from "components/Toast";
import { useActionToast } from "components/useActionToast";
import { useEntity, useReplicache } from "src/replicache";
import { registerBlockGroup } from "src/utils/blockGroups";
import { flushPendingTextWrites } from "components/Blocks/TextBlock/useCollabText";
import { publishAnswer, type QuestionError } from "actions/questions";
import { AnswerEditorFrame } from "./QuestionsView";

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

const publishErrorMessages: Partial<Record<QuestionError["type"], string>> = {
  empty: "Write an answer first.",
  not_owner: "Only the post's author can publish answers.",
  not_found: "This question is no longer on the post.",
  failed: "We couldn't publish this answer. Please try again!",
};

// The author's answer, edited in place under the question with the leaflet's
// own block editor. The entity stays after publishing so the answer can be
// edited again.
export function AnswerEditor(props: {
  blockEntity: string;
  question: string;
  // The page the questions block is on: keyboard and focus handling resolve
  // the answer's blocks to it.
  page: string;
  published: boolean;
  // Closing drops the draft (one just started); otherwise it keeps its
  // edits for next time.
  discardOnClose: boolean;
  onPublished: () => Promise<void>;
  onClose: () => void;
}) {
  let { rep, permission_token } = useReplicache();
  let toaster = useToaster();
  let run = useActionToast<QuestionError>(publishErrorMessages);
  let [publishing, setPublishing] = useState(false);
  let answerEntity = answerEntityFor(props.blockEntity, props.question);
  useEffect(
    () => registerBlockGroup(answerEntity, props.page),
    [answerEntity, props.page],
  );
  let publish = async () => {
    setPublishing(true);
    let published = await run(async () => {
      // Text persists on a debounce and the server reads the facts, so get
      // everything pushed first.
      await flushPendingTextWrites();
      await rep?.push();
      return publishAnswer({ leaflet_id: permission_token.id, answerEntity });
    });
    try {
      if (published) {
        toaster({ content: "Answer published", type: "success" });
        await props.onPublished();
      }
    } finally {
      setPublishing(false);
    }
  };
  let cancel = async () => {
    if (props.discardOnClose)
      await rep?.mutate.discardQuestionAnswer({
        blockEntity: props.blockEntity,
        answerEntity,
      });
    props.onClose();
  };
  return (
    <AnswerEditorFrame
      published={props.published}
      discardOnClose={props.discardOnClose}
      publishing={publishing}
      onPublish={publish}
      onCancel={cancel}
    >
      <Blocks entityID={answerEntity} group />
    </AnswerEditorFrame>
  );
}
