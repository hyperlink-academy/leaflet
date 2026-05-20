import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { BlockMailboxSmall } from "components/Icons/BlockMailboxSmall";
import { NewSmall } from "components/Icons/NewSmall";
import { TrendingSmall } from "components/Icons/TrendingSmall";

export default async function TagLayout(props: {
  children: React.ReactNode;
  params: Promise<{ tag: string }>;
}) {
  const params = await props.params;
  const decodedTag = decodeURIComponent(params.tag);

  return (
    <DashboardShell
      id="tag"
      pageTitle={<PageTitle pageTitle={decodedTag} />}
      tabs={{
        Inbox: { icon: <BlockMailboxSmall />, href: "/reader" },
        Trending: { icon: <TrendingSmall />, href: "/reader/trending" },
        New: { icon: <NewSmall />, href: "/reader/new" },
      }}
    >
      {props.children}
    </DashboardShell>
  );
}
