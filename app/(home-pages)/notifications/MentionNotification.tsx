import { MentionTiny } from "components/Icons/MentionTiny";
import { ContentLayout, Notification } from "./Notification";
import { HydratedMentionNotification } from "src/notifications";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import { Agent, AtUri } from "@atproto/api";

export const MentionNotification = (props: HydratedMentionNotification) => {
  const docRecord = props.document.data as PubLeafletDocument.Record;
  const pubRecord = props.document.documents_in_publications?.[0]?.publications
    ?.record as PubLeafletPublication.Record | undefined;
  const docUri = new AtUri(props.document.uri);
  const rkey = docUri.rkey;
  const did = docUri.host;

  const href = pubRecord
    ? `https://${pubRecord.base_path}/${rkey}`
    : `/p/${did}/${rkey}`;

  let actionText: React.ReactNode;
  let mentionedItemName: string | undefined;
  let mentionedDocRecord = props.mentionedDocument
    ?.data as PubLeafletDocument.Record;

  const mentioner = props.documentCreatorHandle
    ? `@${props.documentCreatorHandle}`
    : "Someone";

  if (props.mention_type === "did") {
    actionText = <>{mentioner} mentioned you</>;
  } else if (
    props.mention_type === "publication" &&
    props.mentionedPublication
  ) {
    const mentionedPubRecord = props.mentionedPublication
      .record as PubLeafletPublication.Record;
    mentionedItemName = mentionedPubRecord.name;
    actionText = (
      <>
        {mentioner} mentioned your publication{" "}
        <span className="italic">{mentionedItemName}</span>
      </>
    );
  } else if (props.mention_type === "document" && props.mentionedDocument) {
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
          <div className="text-sm text-secondary">
            ... this should be some characters in front of{" "}
            <span
              className={
                props.mention_type === "document"
                  ? "italic"
                  : props.mention_type === "publication"
                    ? "font-bold"
                    : ""
              }
            >
              {mentionedItemName ? mentionedItemName : "@handleplaceholder"}
            </span>{" "}
            and some at the end...
          </div>
        </ContentLayout>
      }
    />
  );
};
