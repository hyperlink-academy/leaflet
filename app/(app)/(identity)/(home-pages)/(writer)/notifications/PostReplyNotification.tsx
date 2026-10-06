import { ContentLayout, Notification } from "./Notification";
import { HydratedPostReplyNotification } from "src/notifications";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import { getDocumentURL } from "src/utils/getPublicationURL";

export const PostReplyNotification = (props: HydratedPostReplyNotification) => {
  const displayName =
    props.profile?.displayName || props.profile?.handle || "Someone";
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;

  if (!docRecord) return null;

  // Links to the replied-to post, where the author accepts or hides the reply.
  const href = getDocumentURL(docRecord, props.document_uri, pubRecord);

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<ReplyTiny />}
      actionText={<>{displayName} replied to your post with a post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          {props.replyTitle}
        </ContentLayout>
      }
    />
  );
};
