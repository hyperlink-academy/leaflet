import { Suspense } from "react";
import { getIdentityData } from "actions/getIdentityData";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { FullPageLoading } from "components/PageLayouts/DashboardLoading";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import { NewSmall } from "components/Icons/NewSmall";
import { TrendingSmall } from "components/Icons/TrendingSmall";
import { BlockMailboxSmall } from "components/Icons/BlockMailboxSmall";
import { ReaderContentArea } from "./postViewer/ReaderContentArea";

// Synchronous shell + suspended inner, same as the (identity) and
// (home-pages) layouts above: a fresh mount of this segment (e.g. home →
// /reader) suspends inside their already-committed boundaries, which won't
// re-show their fallback mid-transition — so this segment needs its own
// boundary to commit against while getIdentityData resolves.
export default function ReaderLayout(props: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <ReaderLayoutInner>{props.children}</ReaderLayoutInner>
    </Suspense>
  );
}

async function ReaderLayoutInner(props: { children: React.ReactNode }) {
  const identity = await getIdentityData();
  const tabs: { [name: string]: { href: string; icon: React.ReactNode } } = {};
  if (identity?.atp_did)
    tabs.Inbox = { href: "/reader", icon: <BlockMailboxSmall /> };
  tabs.Trending = { href: "/reader/trending", icon: <TrendingSmall /> };
  tabs.New = { href: "/reader/new", icon: <NewSmall /> };

  return (
    <DashboardShell
      id="reader"
      pageTitle={<PageTitle pageTitle="Reader" />}
      tabs={tabs}
    >
      <ReaderContentArea>{props.children}</ReaderContentArea>
    </DashboardShell>
  );
}
