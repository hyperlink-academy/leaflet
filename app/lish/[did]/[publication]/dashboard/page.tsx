import { redirect } from "next/navigation";
import { DraftsTab } from "./DraftsTab";

export default async function DashboardIndex(props: {
  params: Promise<{ publication: string; did: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await props.searchParams;
  if (tab && tab !== "Drafts") {
    const params = await props.params;
    const base = `/lish/${params.did}/${params.publication}/dashboard`;
    if (tab === "Posts") redirect(`${base}/posts`);
    if (tab === "Subs") redirect(`${base}/subs`);
    if (tab === "Analytics") redirect(`${base}/analytics`);
    if (tab === "Settings") redirect(`${base}/settings`);
  }

  return <DraftsTab />;
}
