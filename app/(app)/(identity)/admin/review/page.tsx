import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminIdentity } from "src/adminAllowlist";
import { pool } from "supabase/pool";
import { POLICY_VERSION, REVIEW_MODE } from "src/review/policy";
import { loadReview, type View } from "./data";
import { ReviewView } from "./ReviewView";

export const metadata = {
  title: "Spam Review",
};

export default async function ReviewSystemPage(props: {
  searchParams: Promise<{
    view?: string;
    q?: string;
    page?: string;
    reason?: string;
  }>;
}) {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminIdentity(identity?.id)) notFound();

  let params = await props.searchParams;
  let view: View =
    params.view === "spam" || params.view === "blocked"
      ? params.view
      : "review";
  let data = await loadReview(pool, {
    view,
    search: typeof params.q === "string" ? params.q : "",
    reason: typeof params.reason === "string" ? params.reason : undefined,
    page: Number.parseInt(params.page ?? "", 10) || 1,
  });

  return (
    <ReviewView
      data={data}
      policyVersion={POLICY_VERSION}
      dryRun={REVIEW_MODE === "dry-run"}
    />
  );
}
