import { QuoteTiny } from "components/Icons/QuoteTiny";
import { ContentLayout, Notification } from "./Notification";
import { HydratedQuoteNotification } from "src/notifications";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import { AtUri } from "@atproto/api";
import { Avatar } from "components/Avatar";

export const QuoteNotification = (props: HydratedQuoteNotification) => {
  const postView = props.bskyPost.post_view as any;
  const author = postView.author;
  const displayName = author.displayName || author.handle || "Someone";
  const docRecord = props.document.data as PubLeafletDocument.Record;
  const pubRecord = props.document.documents_in_publications[0]?.publications
    ?.record as PubLeafletPublication.Record;
  const rkey = new AtUri(props.document.uri).rkey;
  const postText = postView.record?.text || "";

  return (
    <Notification
      timestamp={props.created_at}
      href={`https://${pubRecord.base_path}/${rkey}`}
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
