import {
  AppBskyActorProfile,
  PubLeafletComment,
  PubLeafletDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { HydratedCommentMentionNotification } from "src/notifications";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { MentionTiny } from "components/Icons/MentionTiny";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { AtUri } from "@atproto/api";

export const CommentMentionNotification = (
  props: HydratedCommentMentionNotification,
) => {
  const docRecord = props.commentData.documents
    ?.data as PubLeafletDocument.Record;
  const commentRecord = props.commentData.record as PubLeafletComment.Record;
  const profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const pubRecord = props.commentData.documents?.documents_in_publications[0]
    ?.publications?.record as PubLeafletPublication.Record | undefined;
  const docUri = new AtUri(props.commentData.documents?.uri!);
  const rkey = docUri.rkey;
  const did = docUri.host;

  const href = pubRecord
    ? `https://${pubRecord.base_path}/${rkey}?interactionDrawer=comments`
    : `/p/${did}/${rkey}?interactionDrawer=comments`;

  const commenter = props.commenterHandle
    ? `@${props.commenterHandle}`
    : "Someone";

  let actionText: React.ReactNode;
  let mentionedDocRecord = props.mentionedDocument
    ?.data as PubLeafletDocument.Record;

  if (props.mention_type === "did") {
    actionText = <>{commenter} mentioned you in a comment</>;
  } else if (
    props.mention_type === "publication" &&
    props.mentionedPublication
  ) {
    const mentionedPubRecord = props.mentionedPublication
      .record as PubLeafletPublication.Record;
    actionText = (
      <>
        {commenter} mentioned your publication{" "}
        <span className="italic">{mentionedPubRecord.name}</span> in a comment
      </>
    );
  } else if (props.mention_type === "document" && props.mentionedDocument) {
    actionText = (
      <>
        {commenter} mentioned your post{" "}
        <span className="italic">{mentionedDocRecord.title}</span> in a comment
      </>
    );
  } else {
    actionText = <>{commenter} mentioned you in a comment</>;
  }

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<MentionTiny />}
      actionText={actionText}
      content={
        <ContentLayout postTitle={docRecord?.title} pubRecord={pubRecord}>
          <CommentInNotification
            className=""
            avatar={
              profileRecord?.avatar?.ref &&
              blobRefToSrc(
                profileRecord?.avatar?.ref,
                props.commentData.bsky_profiles?.did || "",
              )
            }
            displayName={
              profileRecord?.displayName ||
              props.commentData.bsky_profiles?.handle ||
              "Someone"
            }
            index={[]}
            plaintext={commentRecord.plaintext}
            facets={commentRecord.facets}
          />
        </ContentLayout>
      }
    />
  );
};
