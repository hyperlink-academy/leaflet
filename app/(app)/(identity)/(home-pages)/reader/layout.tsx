import { Suspense } from "react";
import { getSessionDid } from "src/identityPayload";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { FullPageLoading } from "components/PageLayouts/DashboardLoading";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import { NewSmall } from "components/Icons/NewSmall";
import { TrendingSmall } from "components/Icons/TrendingSmall";
import { BlockMailboxSmall } from "components/Icons/BlockMailboxSmall";

// Synchronous shell + suspended inner, same as the (identity) and
// (home-pages) layouts above: a fresh mount of this segment (e.g. home →
// /reader) suspends inside their already-committed boundaries, which won't
// re-show their fallback mid-transition — so this segment needs its own
// boundary to commit against while the session lookup resolves.
export default function ReaderLayout(props: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <ReaderLayoutInner>{props.children}</ReaderLayoutInner>
    </Suspense>
  );
}

async function ReaderLayoutInner(props: { children: React.ReactNode }) {
  const did = await getSessionDid();
  const tabs: { [name: string]: { href: string; icon: React.ReactNode } } = {};
  if (did) tabs.Inbox = { href: "/reader", icon: <BlockMailboxSmall /> };
  tabs.Trending = { href: "/reader/trending", icon: <TrendingSmall /> };
  tabs.New = { href: "/reader/new", icon: <NewSmall /> };

  return (
    <DashboardShell
      id="reader"
      pageTitle={<PageTitle pageTitle="Reader" />}
      tabs={tabs}
    >
      {props.children}
    </DashboardShell>
  );
}
