import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { HydratedPostQuestionNotification } from "src/notifications";
import { HelpTiny } from "components/Icons/HelpTiny";
import { getDocumentURL } from "src/utils/getPublicationURL";

export const PostQuestionNotification = (
  props: HydratedPostQuestionNotification,
) => {
  const displayName =
    props.profile?.displayName || props.profile?.handle || "Someone";
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;
  if (!docRecord) return null;

  // Links to the post's questions; the author answers from its editor.
  const href =
    getDocumentURL(docRecord, props.document_uri, pubRecord) + "#questions";

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<HelpTiny />}
      actionText={<>{displayName} asked a question on your post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          <CommentInNotification
            className=""
            avatar={props.profile?.avatar ?? undefined}
            displayName={displayName}
            index={[]}
            plaintext={props.plaintext}
            facets={props.facets}
          />
        </ContentLayout>
      }
    />
  );
};
