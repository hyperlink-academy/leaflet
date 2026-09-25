import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminEmail } from "src/adminAllowlist";
import { AdminImport } from "./AdminImport";

export const metadata = {
  title: "Import posts",
};

export default async function ImportPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminEmail(identity?.email)) notFound();

  return <AdminImport />;
}
