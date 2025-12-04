import { MentionTiny } from "components/Icons/MentionTiny";
import { ContentLayout, Notification } from "./Notification";
import { HydratedMentionNotification } from "src/notifications";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import { AtUri } from "@atproto/api";

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

  if (props.mention_type === "did") {
    actionText = <>mentioned you</>;
  } else if (props.mention_type === "publication" && props.mentionedPublication) {
    const mentionedPubRecord = props.mentionedPublication.record as PubLeafletPublication.Record;
    mentionedItemName = mentionedPubRecord.name;
    actionText = <>mentioned your publication <span className="italic">{mentionedItemName}</span></>;
  } else if (props.mention_type === "document" && props.mentionedDocument) {
    const mentionedDocRecord = props.mentionedDocument.data as PubLeafletDocument.Record;
    mentionedItemName = mentionedDocRecord.title;
    actionText = <>mentioned your post <span className="italic">{mentionedItemName}</span></>;
  } else {
    actionText = <>mentioned you</>;
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
            in <span className="italic">{docRecord.title}</span>
          </div>
        </ContentLayout>
      }
    />
  );
};
