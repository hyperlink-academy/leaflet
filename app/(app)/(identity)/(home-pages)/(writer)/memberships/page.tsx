import { redirect } from "next/navigation";

// Memberships & billing now lives in the billing tab of user settings; old
// links (e.g. from payment-failure emails) land here.
export default function MembershipsPage() {
  redirect("/settings?tab=billing");
}
