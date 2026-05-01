import { getIdentityData } from "actions/getIdentityData";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";

export default async function ReaderLayout(props: {
  children: React.ReactNode;
}) {
  const identity = await getIdentityData();
  const tabs: { [name: string]: { href: string } } = {};
  if (identity?.atp_did) tabs.Inbox = { href: "/reader" };
  tabs.Trending = { href: "/reader/trending" };

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
