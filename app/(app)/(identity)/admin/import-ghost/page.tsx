import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminEmail } from "src/adminAllowlist";
import { AdminImportGhost } from "./AdminImportGhost";

export const metadata = {
  title: "Import from Ghost",
};

export default async function ImportGhostPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminEmail(identity?.email)) notFound();

  return <AdminImportGhost />;
}
