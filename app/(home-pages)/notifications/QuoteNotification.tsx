import { QuoteTiny } from "components/Icons/QuoteTiny";
import { ContentLayout, Notification } from "./Notification";
import { HydratedQuoteNotification } from "src/notifications";
import { AtUri } from "@atproto/api";
import { Avatar } from "components/Avatar";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";

export const QuoteNotification = (props: HydratedQuoteNotification) => {
  const postView = props.bskyPost.post_view as any;
  const author = postView.author;
  const displayName = author.displayName || author.handle || "Someone";
  const docRecord = props.normalizedDocument;
  const pubRecord = props.normalizedPublication;

  if (!docRecord) return null;

  const postText = postView.record?.text || "";

  const href = getDocumentURL(docRecord, props.document.uri, pubRecord);

  return (
    <Notification
      timestamp={props.created_at}
      href={href}
      icon={<QuoteTiny />}
      actionText={<>{displayName} quoted your post</>}
      content={
        <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
          <div className="flex gap-2 text-sm w-full">
            <Avatar
              src={author.avatar}
              displayName={displayName}
            />
            <pre
              style={{ wordBreak: "break-word" }}
              className="whitespace-pre-wrap text-secondary line-clamp-3 sm:line-clamp-6"
            >
              {postText}
            </pre>
          </div>
        </ContentLayout>
      }
    />
  );
};
