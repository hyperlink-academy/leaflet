"use client";
import { useEffect, useState } from "react";
import { DashboardPageLayout } from "./DashboardPageLayout";
import { NotificationList } from "app/(home-pages)/(writer)/notifications/NotificationList";
import { getNotifications } from "app/(home-pages)/(writer)/notifications/getNotifications";
import { HydratedNotification } from "src/notifications";

export function NotificationContent() {
  let [notifications, setNotifications] = useState<
    HydratedNotification[] | null
  >(null);

  useEffect(() => {
    getNotifications().then(setNotifications);
  }, []);

  return (
    <DashboardPageLayout
      pageTitle="Notifications"
      scrollKey="notifications-overlay"
      showHeader={false}
    >
      {notifications === null ? (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent-contrast" />
        </div>
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </DashboardPageLayout>
  );
}
