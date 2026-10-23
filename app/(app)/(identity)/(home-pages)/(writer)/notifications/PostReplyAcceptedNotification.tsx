import { ContentLayout, Notification } from "./Notification";
import { HydratedPostReplyAcceptedNotification } from "src/notifications";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import { getDocumentURL } from "src/utils/getPublicationURL";

export const PostReplyAcceptedNotification = (
  props: HydratedPostReplyAcceptedNotification,
) => {
  const displayName =
    props.profile?.displayName || props.profile?.handle || "The author";
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;

  if (!docRecord) return null;

  // Links to the post's replies, where the accepted reply now shows.
  const href =
    getDocumentURL(docRecord, props.document_uri, pubRecord) +
    `#${props.anchor}`;

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<ReplyTiny />}
      actionText={<>{displayName} accepted your reply</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          {props.replyTitle}
        </ContentLayout>
      }
    />
  );
};
