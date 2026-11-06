"use client";
import { useEffect, useState } from "react";
import { v5, v7 } from "uuid";
import { Blocks } from "components/Blocks";
import { blockCommands } from "components/Blocks/BlockCommands";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from "components/Toolbar";
import { TextMarkButtons } from "components/Toolbar/TextToolbar";
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
  let clear = async () => {
    await rep?.mutate.discardQuestionAnswer({
      blockEntity: props.blockEntity,
      answerEntity,
    });
    props.onClose();
  };
  return (
    <AnswerEditorFrame
      tools={<AnswerTools answerEntity={answerEntity} />}
      publishing={publishing}
      onPublish={publish}
      onClear={clear}
    >
      <Blocks entityID={answerEntity} group />
    </AnswerEditorFrame>
  );
}

// The image and formatting buttons beside the answer's publish button, in
// place of the block editor's "/" menu and empty-line buttons.
function AnswerTools(props: { answerEntity: string }) {
  let { rep, undoManager } = useReplicache();
  let { set } = useEntitySetContext();
  let blocks = useBlocks(props.answerEntity);
  let focused = useUIState((s) =>
    s.focusedEntity?.entityType === "block" &&
    s.focusedEntity.parent === props.answerEntity
      ? s.focusedEntity.entityID
      : null,
  );
  // The block menu's Image command, on the line being edited (or the last
  // one): an empty line becomes the image, otherwise it goes below.
  let addImage = async () => {
    if (!rep) return;
    let roots = blocks.filter((b) => !b.listData || b.listData.depth === 1);
    let i = roots.findIndex((b) => b.entityID === focused);
    if (i === -1) i = roots.length - 1;
    let target = roots[i];
    let emptyLine =
      target?.type === "text" &&
      !target.listData &&
      !useEditorStates.getState().editorStates[target.entityID]?.editor.doc
        .textContent;
    await blockCommands
      .find((c) => c.name === "Image")
      ?.onSelect(
        rep,
        {
          parent: props.answerEntity,
          entityID: emptyLine && target ? target.entityID : null,
          position: target?.position ?? null,
          nextPosition: roots[i + 1]?.position ?? null,
          entity_set: set,
        },
        undoManager,
      );
  };
  return (
    <div className="flex items-center gap-0.5">
      <ToolbarButton
        tooltipContent={<div className="font-bold">Add an Image</div>}
        onClick={addImage}
      >
        <BlockImageSmall />
      </ToolbarButton>
      {/* They act on the focused block, which has to be one of the answer's */}
      <div
        className={`flex items-center gap-0.5 ${focused ? "" : "opacity-50 pointer-events-none"}`}
      >
        <TextMarkButtons />
      </div>
    </div>
  );
}
