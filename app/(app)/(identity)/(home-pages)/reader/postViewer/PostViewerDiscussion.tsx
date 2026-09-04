"use client";
import type { Post } from "actions/reader/getReaderFeed";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { getPostInteractions } from "./postInteractions";
import { DiscussionContent } from "components/Interactions/DiscussionModal";
import { GoBackTiny } from "components/Icons/GoBackTiny";
import { PublicationThemeWrapper } from "components/ThemeManager/PublicationThemeProvider";
import { GoToArrow } from "components/Icons/GoToArrow";
import { ButtonPrimary } from "components/Buttons";
import { CloseTiny } from "components/Icons/CloseTiny";

// Discussions render inside the viewer's own box (over the iframe) rather than
// the centered DiscussionModal, so opening them shifts nothing — the box,
// toolbar, and close button all stay put.
export const PostViewerDiscussion = (props: {
  post: Post;
  postRecord: NonNullable<Post["documents"]["data"]>;
  postUrl: string;
}) => {
  let setDiscussionOpen = useReaderPostViewer((s) => s.setDiscussionOpen);
  let { showComments, showMentions, commentsCount, quotesCount } =
    getPostInteractions(props.post);

  return (
    <PublicationThemeWrapper
      postRecord={props.postRecord}
      pubRecord={props.post.publication?.pubRecord}
    >
      <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 bg-bg-page sm:bg-bg-page">
        <div className="max-w-lg mx-auto pb-24">
          <DiscussionContent
            open
            bgColor="bg-bg-page"
            document_uri={props.post.documents.uri}
            postUrl={props.postUrl}
            title={props.postRecord.title}
            commentsCount={commentsCount}
            quotesCount={quotesCount}
            showComments={showComments}
            showMentions={showMentions}
            postLinkButton={
              <ButtonPrimary
                className="text-sm h-[29px]! p-0! rounded-lg!"
                aria-label="Back to post"
                onClick={() => setDiscussionOpen(false)}
              >
                <CloseTiny className="m-1.5 " />
              </ButtonPrimary>
            }
          />
        </div>
      </div>
    </PublicationThemeWrapper>
  );
};
