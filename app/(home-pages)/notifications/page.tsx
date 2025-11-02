import { getIdentityData } from "actions/getIdentityData";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/BaseTextBlock";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { PubLeafletComment, PubLeafletDocument } from "lexicons/api";
import { redirect } from "next/navigation";
import {
  HydratedCommentNotification,
  hydrateNotifications,
} from "src/notifications";
import { supabaseServerClient } from "supabase/serverClient";

export default async function Notifications() {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return redirect("/home");
  let { data, error } = await supabaseServerClient
    .from("notifications")
    .select("*")
    .eq("recipient", identity.atp_did);
  let notifications = await hydrateNotifications(data || []);
  return (
    <DashboardLayout
      id="discover"
      cardBorderHidden={false}
      currentPage="notifications"
      defaultTab="default"
      actions={null}
      tabs={{
        default: {
          controls: null,
          content: (
            <div>
              <h2>Notifications</h2>
              {notifications.map((n) => {
                if (n.type === "comment") {
                  n;
                  return <CommentNotification key={n.id} {...n} />;
                }
              })}
            </div>
          ),
        },
      }}
    />
  );
}

const CommentNotification = (props: HydratedCommentNotification) => {
  let docRecord = props.commentData.documents
    ?.data as PubLeafletDocument.Record;
  let commentRecord = props.commentData.record as PubLeafletComment.Record;
  return (
    <Notification
      identity={props.commentData.bsky_profiles?.handle || "Someone"}
      action="commented on your post"
      content={
        <div>
          <h4>{docRecord.title}</h4>
          <div className="border">
            <pre
              style={{ wordBreak: "break-word" }}
              className="whitespace-pre-wrap text-secondary pb-[4px] "
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

const Notification = (props: {
  identity: string;
  action: string;
  content: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col gap-2 border">
      <div>
        {props.identity} {props.action}
      </div>
      {props.content}
    </div>
  );
};
