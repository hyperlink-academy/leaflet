"use client";
import { DashboardPageLayout } from "./DashboardPageLayout";
import { NotificationList } from "app/(app)/(identity)/(home-pages)/(writer)/notifications/NotificationList";

export function NotificationContent() {
  return (
    <DashboardPageLayout
      pageTitle="Notifications"
      scrollKey="notifications-overlay"
      showHeader={false}
    >
      <NotificationList />
    </DashboardPageLayout>
  );
}
