import { ContentLayout, Notification } from "./Notification";
import { HydratedRecommendNotification } from "src/notifications";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AppBskyActorProfile } from "lexicons/api";
import { Avatar } from "components/Avatar";
import { AtUri } from "@atproto/api";
import { RecommendTinyFilled } from "components/Icons/RecommendTiny";

export const RecommendNotification = (
  props: HydratedRecommendNotification,
) => {
  const profileRecord = props.recommendData?.identities?.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const displayName =
    profileRecord?.displayName ||
    props.recommendData?.identities?.bsky_profiles?.handle ||
    "Someone";
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;
  const avatarSrc =
    profileRecord?.avatar?.ref &&
    blobRefToSrc(
      profileRecord.avatar.ref,
      props.recommendData?.recommender_did || "",
    );

  if (!docRecord) return null;

  const docUri = new AtUri(props.document.uri);
  const rkey = docUri.rkey;
  const did = docUri.host;

  const href = pubRecord ? `${pubRecord.url}/${rkey}` : `/p/${did}/${rkey}`;

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<RecommendTinyFilled />}
      actionText={<>{displayName} recommended your post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          {null}
        </ContentLayout>
      }
    />
  );
};
