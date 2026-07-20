import { PubLeafletComment } from "lexicons/api";
import { HydratedCommentMentionNotification } from "src/notifications";
import { MentionTiny } from "components/Icons/MentionTiny";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { getDocumentURL } from "app/(published)/lish/createPub/getPublicationURL";

export const CommentMentionNotification = (
  props: HydratedCommentMentionNotification,
) => {
  const docRecord = props.normalizedDocument;
  if (!docRecord) return null;

  const commentRecord = props.commentData.record as PubLeafletComment.Record;
  const profile = props.commentData.profile;
  const pubRecord = props.normalizedPublication;

  const href =
    getDocumentURL(docRecord, props.commentData.documents?.uri!, pubRecord) +
    "?interactionDrawer=comments";

  const commenter = props.commenterHandle
    ? `@${props.commenterHandle}`
    : "Someone";

  let actionText: React.ReactNode;
  const mentionedDocRecord = props.normalizedMentionedDocument;

  if (props.mention_type === "did") {
    actionText = <>{commenter} mentioned you in a comment</>;
  } else if (
    props.mention_type === "publication" &&
    props.mentionedPublication
  ) {
    const mentionedPubRecord = props.normalizedMentionedPublication;
    actionText = (
      <>
        {commenter} mentioned your publication{" "}
        <span className="italic">{mentionedPubRecord?.name}</span> in a comment
      </>
    );
  } else if (props.mention_type === "document" && mentionedDocRecord) {
    actionText = (
      <>
        {commenter} mentioned your post{" "}
        <span className="italic">{mentionedDocRecord.title}</span> in a comment
      </>
    );
  } else {
    actionText = <>{commenter} mentioned you in a comment</>;
  }

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<MentionTiny />}
      actionText={actionText}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          <CommentInNotification
            className=""
            avatar={profile?.avatar ?? undefined}
            displayName={
              profile?.displayName || profile?.handle || "Someone"
            }
            index={[]}
            plaintext={commentRecord.plaintext}
            facets={commentRecord.facets}
          />
        </ContentLayout>
      }
    />
  );
};
