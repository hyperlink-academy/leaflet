import { ContentLayout, Notification } from "./Notification";
import { HydratedRecommendNotification } from "src/notifications";
import { RecommendFilledTiny } from "components/Icons/RecommendTiny";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";

export const RecommendNotification = (
  props: HydratedRecommendNotification,
) => {
  const profile = props.recommendData?.profile;
  const displayName =
    profile?.displayName || profile?.handle || "Someone";
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;

  if (!docRecord) return null;

  const href = getDocumentURL(docRecord, props.document.uri, pubRecord);

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<RecommendFilledTiny />}
      actionText={<>{displayName} recommended your post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          {null}
        </ContentLayout>
      }
    />
  );
};
