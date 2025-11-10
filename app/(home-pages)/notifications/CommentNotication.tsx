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

export const CommentNotification = (props: HydratedCommentNotification) => {
  let docRecord = props.commentData.documents
    ?.data as PubLeafletDocument.Record;
  let commentRecord = props.commentData.record as PubLeafletComment.Record;
  let profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const displayName =
    profileRecord.displayName ||
    props.commentData.bsky_profiles?.handle ||
    "Someone";
  const publication = props.commentData.documents?.documents_in_publications[0]
    ?.publications?.record as PubLeafletPublication.Record;
  return (
    <Notification
      icon={<CommentTiny />}
      actionText={<>{displayName} commented on your post</>}
      content={
        <ContentLayout postTitle={docRecord.title} publication={publication}>
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

export const DummyCommentNotification = () => {
  return (
    <Notification
      icon={<CommentTiny />}
      actionText={<>celine commented on your post</>}
      content={
        <ContentLayout
          postTitle="This is the Post Title"
          publication={{ name: "My Publication" } as PubLeafletPublication.Record}
        >
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
