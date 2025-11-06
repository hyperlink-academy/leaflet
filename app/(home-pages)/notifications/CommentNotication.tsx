import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import {
  AppBskyActorProfile,
  PubLeafletComment,
  PubLeafletDocument,
} from "lexicons/api";
import { HydratedCommentNotification } from "src/notifications";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { Avatar } from "components/Avatar";
import {
  CommentInNotification,
  ContentLayout,
  Notification,
} from "./Notification";

export const CommentNotification = (props: HydratedCommentNotification) => {
  let docRecord = props.commentData.documents
    ?.data as PubLeafletDocument.Record;
  let commentRecord = props.commentData.record as PubLeafletComment.Record;
  let profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  return (
    <Notification
      identity={profileRecord.displayName || "Someone"}
      action={{ type: "comment" }}
      content={
        <ContentLayout postTitle={docRecord.title}>
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

export const DummyCommentNotification = () => {
  return (
    <Notification
      identity={"celine"}
      action={{ type: "comment" }}
      content={
        <ContentLayout postTitle="This is the Post Title">
          <CommentInNotification
            className=""
            avatar={undefined}
            displayName="celine"
            index={[]}
            plaintext={
              "heyyyyy this is a dummt comment! I'm just gonna put this here so I know what I'm about but it really oughta be wired up at some point..."
            }
            facets={[]}
          />
        </ContentLayout>
      }
    />
  );
};
