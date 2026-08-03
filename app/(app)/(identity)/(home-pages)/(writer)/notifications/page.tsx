import { getIdentityData } from "actions/getIdentityData";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { redirect } from "next/navigation";
import { getNotificationPage } from "src/notificationQueries";
import { NotificationList } from "./NotificationList";

export default async function NotificationsPage() {
  return (
    <DashboardPageLayout
      pageTitle="Notifications"
      scrollKey="dashboard-discover-default"
      showHeader={false}
    >
      <NotificationContent />
    </DashboardPageLayout>
  );
}

const NotificationContent = async () => {
  let identity = await getIdentityData();
  if (!identity?.atp_did) return redirect("/home");
  let page = await getNotificationPage(identity.atp_did);
  return <NotificationList fallbackPage={page} />;
};
