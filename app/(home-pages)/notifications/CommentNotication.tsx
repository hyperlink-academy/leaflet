import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/Blocks/BaseTextBlock";
import { AppBskyActorProfile, PubLeafletComment } from "lexicons/api";
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

export const CommentNotification = (props: HydratedCommentNotification) => {
  const docRecord = props.normalizedDocument;
  const commentRecord = props.commentData.record as PubLeafletComment.Record;
  const profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;

  if (!docRecord) return null;

  const displayName =
    profileRecord?.displayName ||
    props.commentData.bsky_profiles?.handle ||
    "Someone";
  const pubRecord = props.normalizedPublication;
  const docUri = new AtUri(props.commentData.documents?.uri!);
  const rkey = docUri.rkey;
  const did = docUri.host;

  const href = pubRecord
    ? `${pubRecord.url}/${rkey}?interactionDrawer=comments`
    : `/p/${did}/${rkey}?interactionDrawer=comments`;

  return (
    <Notification
      timestamp={props.commentData.indexed_at}
      href={href}
      icon={<CommentTiny />}
      actionText={<>{displayName} commented on your post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
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
