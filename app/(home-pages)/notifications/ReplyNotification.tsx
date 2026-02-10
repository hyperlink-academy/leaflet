import { Avatar } from "components/Avatar";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/Blocks/BaseTextBlock";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";
import { HydratedCommentNotification } from "src/notifications";
import { PubLeafletComment } from "lexicons/api";
import { AppBskyActorProfile, AtUri } from "@atproto/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";

export const ReplyNotification = (props: HydratedCommentNotification) => {
  const docRecord = props.normalizedDocument;
  const commentRecord = props.commentData.record as PubLeafletComment.Record;
  const profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;

  if (!docRecord) return null;

  const displayName =
    profileRecord?.displayName ||
    props.commentData.bsky_profiles?.handle ||
    "Someone";

  const parentRecord = props.parentData?.record as PubLeafletComment.Record;
  const parentProfile = props.parentData?.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const parentDisplayName =
    parentProfile?.displayName ||
    props.parentData?.bsky_profiles?.handle ||
    "Someone";

  const pubRecord = props.normalizedPublication;

  const href =
    getDocumentURL(docRecord, props.commentData.documents?.uri!, pubRecord) +
    "?interactionDrawer=comments";

  return (
    <Notification
      timestamp={props.commentData.indexed_at}
      href={href}
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
