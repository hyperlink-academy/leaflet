"use client";
import { AtUri } from "@atproto/syntax";
import { PostContent } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostContent";
import { useOptionalPostResources } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostDataProvider";
import type { DocumentQuestion } from "src/documentQuestions";
import { QuestionAnswer } from "./QuestionsView";

// An answer's blocks, rendered like the post they sit on. On the published
// page the post's resources carry the answers' embeds too; the editor has
// none, so embeds there show their fallbacks.
export function PublishedAnswer(props: {
  answer: NonNullable<DocumentQuestion["answer"]>;
  showHandle?: boolean;
  labeled?: boolean;
}) {
  let resources = useOptionalPostResources();
  return (
    <QuestionAnswer
      author={props.answer.author}
      showHandle={props.showHandle}
      date={props.answer.createdAt}
      labeled={props.labeled}
    >
      <PostContent
        className="px-0! pt-0! [&>*:last-child]:mb-0!"
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
