import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminIdentity } from "src/adminAllowlist";
import { AdminImport } from "./AdminImport";

// Applies to the importers' server actions: one post's request downloads and
// re-uploads every image, then publishes, which can take minutes.
export const maxDuration = 300;

export const metadata = {
  title: "Import posts",
};

export default async function ImportPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminIdentity(identity?.id)) notFound();

  return <AdminImport />;
}
