"use client";
import { AtUri } from "@atproto/syntax";
import { PostContent } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostContent";
import { useOptionalPostResources } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostDataProvider";
import type { DocumentQuestion } from "src/documentQuestions";

// An answer's blocks, rendered like the post they sit on. On the published
// page the post's resources carry the answers' embeds too; the editor has
// none, so embeds there show their fallbacks.
export function PublishedAnswer(props: {
  answer: NonNullable<DocumentQuestion["answer"]>;
}) {
  let resources = useOptionalPostResources();
  return (
    <div className="publishedAnswer flex flex-col gap-1">
      <div className="text-xs font-bold uppercase text-tertiary">Answer</div>
      <PostContent
        className="px-0! pt-0!"
        blocks={props.answer.content.blocks}
        did={new AtUri(props.answer.uri).host}
        pages={[]}
        bskyPostData={resources?.bskyPostData ?? []}
        standardSitePostData={resources?.standardSitePostData ?? []}
        pollData={[]}
        preview
      />
    </div>
  );
}
