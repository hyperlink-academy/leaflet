import { ContentLayout, Notification } from "./Notification";
import { HydratedQuestionAnsweredNotification } from "src/notifications";
import { HelpTiny } from "components/Icons/HelpTiny";
import { getDocumentURL } from "src/utils/getPublicationURL";

export const QuestionAnsweredNotification = (
  props: HydratedQuestionAnsweredNotification,
) => {
  const displayName =
    props.profile?.displayName || props.profile?.handle || "The author";
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;
  if (!docRecord) return null;

  // Links to the post's questions, where the answer shows.
  const href =
    getDocumentURL(docRecord, props.document_uri, pubRecord) + "#questions";

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<HelpTiny />}
      actionText={<>{displayName} answered your question</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          <span className="italic text-secondary">{props.plaintext}</span>
        </ContentLayout>
      }
    />
  );
};
