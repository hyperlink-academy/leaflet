import { Avatar } from "components/Avatar";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { HydratedCommentNotification } from "src/notifications";
import {
  PubLeafletComment,
  PubLeafletDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { AppBskyActorProfile, AtUri } from "@atproto/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

export const ReplyNotification = (props: HydratedCommentNotification) => {
  let docRecord = props.commentData.documents
    ?.data as PubLeafletDocument.Record;
  let commentRecord = props.commentData.record as PubLeafletComment.Record;
  let profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const displayName =
    profileRecord.displayName ||
    props.commentData.bsky_profiles?.handle ||
    "Someone";

  let parentRecord = props.parentData?.record as PubLeafletComment.Record;
  let parentProfile = props.parentData?.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const parentDisplayName =
    parentProfile.displayName ||
    props.parentData?.bsky_profiles?.handle ||
    "Someone";

  let rkey = new AtUri(props.commentData.documents?.uri!).rkey;
  const pubRecord = props.commentData.documents?.documents_in_publications[0]
    ?.publications?.record as PubLeafletPublication.Record;

  return (
    <Notification
      timestamp={commentRecord.createdAt}
      href={`https://${pubRecord.base_path}/${rkey}?interactionDrawer=comments`}
      icon={<ReplyTiny />}
      actionText={`${displayName} replied to your comment`}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          <CommentInNotification
            className=""
            avatar={
              parentProfile?.avatar?.ref &&
              blobRefToSrc(
                parentProfile?.avatar?.ref,
                props.parentData?.bsky_profiles?.did || "",
              )
            }
            displayName={parentDisplayName}
            index={[]}
            plaintext={parentRecord.plaintext}
            facets={parentRecord.facets}
          />
          <div className="h-3 -mt-[1px] ml-[10px] border-l border-border" />
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
