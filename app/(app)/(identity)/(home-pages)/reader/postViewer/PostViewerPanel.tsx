"use client";
import type { Post } from "actions/reader/getReaderFeed";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { getPostInteractions } from "./postInteractions";
import { DiscussionContent } from "components/Interactions/DiscussionModal";
import { RecommendsList } from "components/Interactions/RecommendsList";
import { RecommendButton } from "components/Interactions/RecommendButton";
import { TagPostsList } from "components/Interactions/TagPostsList";
import { PublicationThemeWrapper } from "components/ThemeManager/PublicationThemeProvider";
import { ButtonPrimary } from "components/Buttons";

// Panels render inside the viewer's own box (over the iframe) rather than in a
// centered modal, so opening them shifts nothing — the box, toolbar, and close
// button all stay put.
export const PostViewerPanel = (props: {
  post: Post;
  postRecord: NonNullable<Post["documents"]["data"]>;
  postUrl: string;
}) => {
  let panel = useReaderPostViewer((s) => s.panel);
  let setPanel = useReaderPostViewer((s) => s.setPanel);
  let openViewer = useReaderPostViewer((s) => s.openViewer);
  let {
    showComments,
    showMentions,
    commentsCount,
    quotesCount,
    recommendsCount,
  } = getPostInteractions(props.post);
  if (!panel) return null;

  let pubRecord = props.post.publication?.pubRecord;
  let backToPost = (
    <ButtonPrimary
      className="text-sm!"
      compact
      aria-label="Back to post"
      onClick={() => setPanel(null)}
    >
      Back to Post
    </ButtonPrimary>
  );

  return (
    <PublicationThemeWrapper
      postRecord={props.postRecord}
      pubRecord={pubRecord}
    >
      <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3  bg-bg-page sm:bg-bg-page">
        <div className="max-w-full sm:px-6  mx-auto pb-24">
          {panel.type === "discussion" ? (
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
              postLinkButton={backToPost}
              headerClassName="sm:pt-3"
            />
          ) : (
            <>
              <div className="sticky top-0 z-10 bg-bg-page -mx-3 sm:pt-3">
                <div className="flex items-center justify-between gap-3 pt-3 pb-2 px-3">
                  {panel.type === "tag" ? (
                    <h3 className="truncate min-w-0">
                      More posts tagged "{panel.tag}"
                    </h3>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <h3>Recommends</h3>
                      <RecommendButton
                        documentUri={props.post.documents.uri}
                        recommendsCount={recommendsCount}
                        recommendOnly
                        className="text-sm text-tertiary"
                      />
                    </div>
                  )}
                  {backToPost}
                </div>
                <hr className="border-border-light" />
              </div>
              <div className="pt-3">
                {panel.type === "tag" ? (
                  <TagPostsList
                    tag={panel.tag}
                    documentUri={props.post.documents.uri}
                    publicationUri={props.post.publication?.uri}
                    showOtherPublications={
                      pubRecord?.preferences?.showOtherPublicationsInTags !==
                      false
                    }
                    onOpenPost={(posts, uri) => openViewer(posts, uri)}
                  />
                ) : (
                  <RecommendsList documentUri={props.post.documents.uri} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PublicationThemeWrapper>
  );
};
