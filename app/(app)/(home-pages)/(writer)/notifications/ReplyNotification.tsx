import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { HydratedCommentNotification } from "src/notifications";
import { PubLeafletComment } from "lexicons/api";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import { getDocumentURL } from "app/(published)/lish/createPub/getPublicationURL";

export const ReplyNotification = (props: HydratedCommentNotification) => {
  const docRecord = props.normalizedDocument;
  const commentRecord = props.commentData.record as PubLeafletComment.Record;
  const profile = props.commentData.profile;

  if (!docRecord) return null;

  const displayName =
    profile?.displayName || profile?.handle || "Someone";

  const parentRecord = props.parentData?.record as PubLeafletComment.Record;
  const parentProfile = props.parentData?.profile;
  const parentDisplayName =
    parentProfile?.displayName || parentProfile?.handle || "Someone";

  const pubRecord = props.normalizedPublication;

  const href =
    getDocumentURL(docRecord, props.commentData.documents?.uri!, pubRecord) +
    "?interactionDrawer=comments";

  return (
    <Notification
      timestamp={props.commentData.indexed_at}
      href={href}
      icon={<ReplyTiny />}
      actionText={`${displayName} replied to your comment`}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          <CommentInNotification
            className=""
            avatar={parentProfile?.avatar ?? undefined}
            displayName={parentDisplayName}
            index={[]}
            plaintext={parentRecord.plaintext}
            facets={parentRecord.facets}
          />
          <div className="h-3 -mt-[1px] ml-[10px] border-l border-border" />
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
