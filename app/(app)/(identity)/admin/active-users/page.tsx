import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminEmail } from "src/adminAllowlist";
import { ActiveUsersDashboard } from "./ActiveUsersDashboard";

export const metadata = {
  title: "Active Users Admin",
};

export default async function ActiveUsersPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminEmail(identity?.email)) notFound();

  return <ActiveUsersDashboard />;
}
