import { getIdentityData } from "actions/getIdentityData";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { redirect } from "next/navigation";
import { hydrateNotifications } from "src/notifications";
import { supabaseServerClient } from "supabase/serverClient";
import { CommentNotification } from "./CommentNotication";

export default async function Notifications() {
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
          content: <NotificationContent />,
        },
      }}
    />
  );
}

const NotificationContent = async () => {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return redirect("/home");
  let { data } = await supabaseServerClient
    .from("notifications")
    .select("*")
    .eq("recipient", identity.atp_did);
  let notifications = await hydrateNotifications(data || []);
  return (
    <div className="max-w-prose mx-auto w-full">
      <div className="flex flex-col gap-6 pt-1">
        {notifications.map((n) => {
          if (n.type === "comment") {
            n;
            return <CommentNotification key={n.id} {...n} />;
          }
        })}
      </div>
    </div>
  );
};
