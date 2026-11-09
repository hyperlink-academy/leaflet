"use client";
import { useEffect, useMemo, useState } from "react";
import { v5, v7 } from "uuid";
import { Blocks } from "components/Blocks";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import type { ComposerEditor } from "components/Composer";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useToaster } from "components/Toast";
import { useActionToast } from "components/useActionToast";
import { useReplicache, type Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex, scanIndexLocal } from "src/replicache/utils";
import { registerBlockGroup } from "src/utils/blockGroups";
import { flushPendingTextWrites } from "components/Blocks/TextBlock/useCollabText";
import { IsLimitedContext } from "components/Blocks/TextBlock/useIsLimited";
import { publishAnswer, type QuestionError } from "actions/questions";
import { LimitedLeafletComposer } from "components/Composer/LimitedLeafletComposer";

// A question's answer entity is named after it, so nothing has to be looked
// up to find the draft (or know there isn't one).
export function answerEntityFor(blockEntity: string, question: string) {
  return v5(question, blockEntity);
}

// The questions the block has answer drafts for
export function useAnswerDrafts(blockEntity: string): string[] {
  let { rep, initialFacts } = useReplicache();
  let fallback = useMemo(
    () => answerDrafts(initialFacts, blockEntity),
    [initialFacts, blockEntity],
  );
  let drafts = useSubscribe(
    rep,
    async (tx) => {
      if (!(await tx.get("initialized"))) return null;
      let scan = scanIndex(tx);
      let refs = await scan.eav(blockEntity, "questions/answer");
      let facts: Fact<Attribute>[] = [...refs];
      for (let ref of refs)
        facts.push(...(await scan.eav(ref.data.value, "answer/question")));
      return answerDrafts(facts, blockEntity);
    },
    { default: null, dependencies: [blockEntity] },
  );
  return drafts ?? fallback;
}

function answerDrafts(facts: Fact<Attribute>[], blockEntity: string) {
  let scan = scanIndexLocal(facts);
  return scan
    .eav(blockEntity, "questions/answer")
    .flatMap((ref) =>
      scan.eav(ref.data.value, "answer/question").map((q) => q.data.value),
    );
}

// Starts a draft for the question, unless it has one (createQuestionAnswer
// keeps an existing one).
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
// own block editor, limited (see useIsLimited) and in the composer's chrome.
// Drafts live in the leaflet, so they sync across devices and editors. The
// entity stays after publishing so the answer can be edited again.
export function LimitedLeafletEditor(props: {
  blockEntity: string;
  question: string;
  // The page the questions block is on: keyboard and focus handling resolve
  // the answer's blocks to it.
  page: string;
  onPublished: () => Promise<unknown>;
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
  let editor = useFocusedEditorIn(answerEntity);
  return (
    <LimitedLeafletComposer
      editor={editor}
      publishing={publishing}
      onPublish={publish}
      onClear={clear}
    >
      {/* Blocks pad themselves for a page; pull them back to the name line.
          Answers don't get the add-block buttons on empty lines either. */}
      <div className="-mx-3 sm:-mx-4 [&_.newLineActions]:hidden">
        <IsLimitedContext.Provider value={true}>
          <Blocks entityID={answerEntity} group />
        </IsLimitedContext.Provider>
      </div>
    </LimitedLeafletComposer>
  );
}

// The editor of the answer's block being typed in, for the composer's
// formatting buttons
function useFocusedEditorIn(answerEntity: string): ComposerEditor | null {
  let focused = useUIState((s) =>
    s.focusedEntity?.entityType === "block" &&
    s.focusedEntity.parent === answerEntity
      ? s.focusedEntity.entityID
      : null,
  );
  let editor = useEditorStates((s) =>
    focused ? s.editorStates[focused] : undefined,
  );
  return editor ? { state: editor.editor, view: editor.view } : null;
}
