import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { ContentLayout, Notification } from "./Notification";
import { HydratedBskyPostEmbedNotification } from "src/notifications";
import { AtUri } from "@atproto/api";

export const BskyPostEmbedNotification = (
  props: HydratedBskyPostEmbedNotification,
) => {
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;

  if (!docRecord) return null;

  const docUri = new AtUri(props.document.uri);
  const rkey = docUri.rkey;
  const did = docUri.host;

  const href = pubRecord ? `${pubRecord.url}/${rkey}` : `/p/${did}/${rkey}`;

  const embedder = props.documentCreatorHandle
    ? `@${props.documentCreatorHandle}`
    : "Someone";

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<BlueskyTiny />}
      actionText={<>{embedder} embedded your Bluesky post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          {props.bskyPostText && (
            <pre
              style={{ wordBreak: "break-word" }}
              className="whitespace-pre-wrap text-secondary line-clamp-3 text-sm"
            >
              {props.bskyPostText}
            </pre>
          )}
        </ContentLayout>
      }
    />
  );
};
