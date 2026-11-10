"use client";
import { AtUri } from "@atproto/syntax";
import { PostContent } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostContent";
import { useOptionalPostResources } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostDataProvider";
import type { DocumentQuestion } from "src/documentQuestions";
import { QuestionAnswer } from "./QuestionsView";

export function PublishedAnswer(props: {
  answer: NonNullable<DocumentQuestion["answer"]>;
  showHandle?: boolean;
  actions?: React.ReactNode;
}) {
  let resources = useOptionalPostResources();
  return (
    <QuestionAnswer
      author={props.answer.author}
      showHandle={props.showHandle}
      date={props.answer.createdAt}
      actions={props.actions}
    >
      <PostContent
        className="px-0! pt-0! leading-snug [&>*:last-child]:mb-0!"
        blocks={props.answer.content.blocks}
        did={new AtUri(props.answer.uri).host}
        pages={[]}
        bskyPostData={resources?.bskyPostData ?? []}
        standardSitePostData={resources?.standardSitePostData ?? []}
        pollData={[]}
        preview
      />
    </QuestionAnswer>
  );
}
