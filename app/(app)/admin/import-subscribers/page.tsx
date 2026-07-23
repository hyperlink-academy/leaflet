import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminEmail } from "src/adminAllowlist";
import { AdminImportSubscribers } from "./AdminImportSubscribers";

export const metadata = {
  title: "Import Email Subscribers",
};

export default async function ImportSubscribersPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminEmail(identity?.email)) notFound();

  return <AdminImportSubscribers />;
}
