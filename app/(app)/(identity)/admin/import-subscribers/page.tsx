import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminIdentity } from "src/adminAllowlist";
import { AdminImportSubscribers } from "./AdminImportSubscribers";

export const metadata = {
  title: "Import Email Subscribers",
};

export default async function ImportSubscribersPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminIdentity(identity?.id)) notFound();

  return <AdminImportSubscribers />;
}
