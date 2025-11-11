import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import {
  AppBskyActorProfile,
  PubLeafletComment,
  PubLeafletDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { HydratedCommentNotification } from "src/notifications";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { Avatar } from "components/Avatar";
import { CommentTiny } from "components/Icons/CommentTiny";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { AtUri } from "@atproto/api";

export const CommentNotification = (
  props: { cardBorderHidden: boolean } & HydratedCommentNotification,
) => {
  let docRecord = props.commentData.documents
    ?.data as PubLeafletDocument.Record;
  let commentRecord = props.commentData.record as PubLeafletComment.Record;
  let profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const displayName =
    profileRecord.displayName ||
    props.commentData.bsky_profiles?.handle ||
    "Someone";
  const pubRecord = props.commentData.documents?.documents_in_publications[0]
    ?.publications?.record as PubLeafletPublication.Record;
  let rkey = new AtUri(props.commentData.documents?.uri!).rkey;

  return (
    <Notification
      href={`https://${pubRecord.base_path}/${rkey}?interactionDrawer=comments`}
      cardBorderHidden={props.cardBorderHidden}
      icon={<CommentTiny />}
      actionText={<>{displayName} commented on your post</>}
      content={
        <ContentLayout
          cardBorderHidden={props.cardBorderHidden}
          postTitle={docRecord.title}
          pubRecord={pubRecord}
        >
          <CommentInNotification
            className=""
            avatar={
              profileRecord?.avatar?.ref &&
              blobRefToSrc(
                profileRecord?.avatar?.ref,
                props.commentData.bsky_profiles?.did || "",
              )
            }
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
