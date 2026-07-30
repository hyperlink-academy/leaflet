import { getIdentityData } from "actions/getIdentityData";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import { NewSmall } from "components/Icons/NewSmall";
import { TrendingSmall } from "components/Icons/TrendingSmall";
import { BlockMailboxSmall } from "components/Icons/BlockMailboxSmall";

export default async function ReaderLayout(props: {
  children: React.ReactNode;
}) {
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
      {props.children}
    </DashboardShell>
  );
}
