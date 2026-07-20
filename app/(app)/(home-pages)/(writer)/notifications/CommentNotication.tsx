import { PubLeafletComment } from "lexicons/api";
import { HydratedCommentNotification } from "src/notifications";
import { CommentTiny } from "components/Icons/CommentTiny";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { getDocumentURL } from "app/(published)/lish/createPub/getPublicationURL";

export const CommentNotification = (props: HydratedCommentNotification) => {
  const docRecord = props.normalizedDocument;
  const commentRecord = props.commentData.record as PubLeafletComment.Record;
  const profile = props.commentData.profile;

  if (!docRecord) return null;

  const displayName =
    profile?.displayName || profile?.handle || "Someone";
  const pubRecord = props.normalizedPublication;

  const href =
    getDocumentURL(docRecord, props.commentData.documents?.uri!, pubRecord) +
    "?interactionDrawer=comments";

  return (
    <Notification
      timestamp={props.commentData.indexed_at}
      href={href}
      icon={<CommentTiny />}
      actionText={<>{displayName} commented on your post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          <CommentInNotification
            className=""
            avatar={profile?.avatar ?? undefined}
            displayName={displayName}
            index={[]}
            plaintext={commentRecord.plaintext}
            facets={commentRecord.facets}
          />
        </ContentLayout>
      }
    />
  );
};
