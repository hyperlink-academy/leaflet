"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { HomeSmall } from "components/Icons/HomeSmall";
import { LooseleafTiny } from "components/Icons/LooseleafTiny";
import { NotificationsUnreadSmall } from "components/Icons/NotificationSmall";
import { Actions } from "./home/Actions/Actions";

const PAGE_META = [
  {
    prefix: "/home",
    id: "home",
    title: "Home",
  },
  {
    prefix: "/looseleafs",
    id: "looseleafs",
    title: "Looseleafs",
    showHomeButton: true,
  },
  {
    prefix: "/notifications",
    id: "notifications",
    title: "Notifications",
    showHomeButton: true,
  },
  {
    prefix: "/subscriptions",
    id: "subscriptions",
    title: "Your Subscriptions",
    showHomeButton: true,
  },
  {
    prefix: "/settings",
    id: "settings",
    title: "Settings",
    showHomeButton: true,
  },
];

export function WriterShell(props: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = PAGE_META.find((m) => pathname.startsWith(m.prefix));

  return (
    <DashboardShell
      id={meta?.id ?? ""}
      pageTitle={
        meta && (
          <PageTitle
            pageTitle={meta.title}
            showHomeButton={meta.showHomeButton}
          />
        )
      }
      actions={<Actions />}
    >
      {props.children}
    </DashboardShell>
  );
}
