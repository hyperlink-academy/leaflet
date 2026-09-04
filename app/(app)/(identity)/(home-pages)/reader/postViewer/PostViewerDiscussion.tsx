"use client";
import type { Post } from "actions/reader/getReaderFeed";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { getPostInteractions } from "./postInteractions";
import { DiscussionContent } from "components/Interactions/DiscussionModal";
import { GoBackTiny } from "components/Icons/GoBackTiny";

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
    <>
      {/* bg split matches DiscussionContent's sticky header (plain
          bg-page on mobile, the bg-light tint on desktop like the modal). */}
      <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 bg-bg-page sm:bg-[var(--color-bg-light)]">
        <div className="max-w-lg mx-auto pb-24">
          <DiscussionContent
            open
            document_uri={props.post.documents.uri}
            postUrl={props.postUrl}
            title={props.postRecord.title}
            commentsCount={commentsCount}
            quotesCount={quotesCount}
            showComments={showComments}
            showMentions={showMentions}
          />
        </div>
      </div>
      <button
        aria-label="Back to post"
        className="absolute left-3 rounded-full border border-border-light bg-bg-page p-1.5 text-secondary shadow-md hover:text-accent-contrast"
        style={{ top: "max(env(safe-area-inset-top), 12px)" }}
        onClick={() => setDiscussionOpen(false)}
      >
        <GoBackTiny />
      </button>
    </>
  );
};
