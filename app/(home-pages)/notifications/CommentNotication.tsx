import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import {
  AppBskyActorProfile,
  PubLeafletComment,
  PubLeafletDocument,
} from "lexicons/api";
import { HydratedCommentNotification } from "src/notifications";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { Avatar } from "components/Avatar";
import { Notification } from "./Notification";

export const CommentNotification = (props: HydratedCommentNotification) => {
  let docRecord = props.commentData.documents
    ?.data as PubLeafletDocument.Record;
  let commentRecord = props.commentData.record as PubLeafletComment.Record;
  let profileRecord = props.commentData.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  return (
    <Notification
      identity={profileRecord.displayName || "Someone"}
      action="comment"
      content={
        <div className="flex flex-col gap-0.5 mt-2">
          <div className="text-tertiary text-sm italic font-bold">
            {docRecord.title}
          </div>
          <div className="flex gap-2 border border-border rounded-lg! p-2 text-sm w-full ">
            <Avatar
              src={
                profileRecord?.avatar?.ref &&
                blobRefToSrc(
                  profileRecord?.avatar?.ref,
                  props.commentData.bsky_profiles?.did || "",
                )
              }
              displayName={profileRecord?.displayName}
            />{" "}
            <pre
              style={{ wordBreak: "break-word" }}
              className="whitespace-pre-wrap text-secondary pt-0.5 line-clamp-6"
            >
              <BaseTextBlock
                index={[]}
                plaintext={commentRecord.plaintext}
                facets={commentRecord.facets}
              />
            </pre>
          </div>
        </div>
      }
    />
  );
};
