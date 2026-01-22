import { MentionTiny } from "components/Icons/MentionTiny";
import { ContentLayout, Notification } from "./Notification";
import { HydratedMentionNotification } from "src/notifications";
import { AtUri } from "@atproto/api";

export const MentionNotification = (props: HydratedMentionNotification) => {
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;

  if (!docRecord) return null;

  const docUri = new AtUri(props.document.uri);
  const rkey = docUri.rkey;
  const did = docUri.host;

  const href = pubRecord
    ? `${pubRecord.url}/${rkey}`
    : `/p/${did}/${rkey}`;

  let actionText: React.ReactNode;
  let mentionedItemName: string | undefined;
  const mentionedDocRecord = props.normalizedMentionedDocument;

  const mentioner = props.documentCreatorHandle
    ? `@${props.documentCreatorHandle}`
    : "Someone";

  if (props.mention_type === "did") {
    actionText = <>{mentioner} mentioned you</>;
  } else if (
    props.mention_type === "publication" &&
    props.mentionedPublication
  ) {
    const mentionedPubRecord = props.normalizedMentionedPublication;
    mentionedItemName = mentionedPubRecord?.name;
    actionText = (
      <>
        {mentioner} mentioned your publication{" "}
        <span className="italic">{mentionedItemName}</span>
      </>
    );
  } else if (props.mention_type === "document" && mentionedDocRecord) {
    mentionedItemName = mentionedDocRecord.title;
    actionText = (
      <>
        {mentioner} mentioned your post{" "}
        <span className="italic">{mentionedItemName}</span>
      </>
    );
  } else {
    actionText = <>{mentioner} mentioned you</>;
  }

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<MentionTiny />}
      actionText={actionText}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          {docRecord.description && docRecord.description}
        </ContentLayout>
      }
    />
  );
};
