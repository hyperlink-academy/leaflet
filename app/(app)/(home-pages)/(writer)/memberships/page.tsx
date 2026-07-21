import { redirect } from "next/navigation";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { getMyMemberships } from "actions/memberships";
import { MembershipsManager } from "./MembershipsManager";

export default async function MembershipsPage() {
  const data = await getMyMemberships();
  if (!data) redirect("/home");

  return (
    <DashboardPageLayout
      pageTitle="Memberships & billing"
      scrollKey="memberships"
      showHeader={false}
    >
      <MembershipsManager initial={data} />
    </DashboardPageLayout>
  );
}
