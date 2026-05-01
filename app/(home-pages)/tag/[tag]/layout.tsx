import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { TagTiny } from "components/Icons/TagTiny";

export default async function TagLayout(props: {
  children: React.ReactNode;
  params: Promise<{ tag: string }>;
}) {
  const params = await props.params;
  const decodedTag = decodeURIComponent(params.tag);

  return (
    <DashboardShell
      id="tag"
      pageTitle={<PageTitle icon={<TagTiny />} pageTitle={decodedTag} />}
      tabs={{
        Inbox: { href: "/reader" },
        Trending: { href: "/reader/trending" },
      }}
    >
      {props.children}
    </DashboardShell>
  );
}
