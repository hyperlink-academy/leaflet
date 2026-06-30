import { redirect } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { ProCheckoutLogin } from "./ProCheckoutLogin";
import { ProCheckoutTrigger } from "./ProCheckoutTrigger";

export const metadata = {
  title: "Get Leaflet Pro",
};

export default async function ProCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cadence?: string; coupon?: string }>;
}) {
  const { cadence: rawCadence, coupon } = await searchParams;
  const cadence: "month" | "year" = rawCadence === "month" ? "month" : "year";

  const identity = await getIdentityData();

  if (identity?.entitlements?.publication_analytics) {
    redirect("/home?upgrade=already-pro");
  }

  const redirectRoute = `/checkout/pro?cadence=${cadence}${coupon ? `&coupon=${coupon}` : ""}`;

  return (
    <div className="proCheckoutPage relative w-full min-h-[100dvh] flex items-center justify-center bg-bg-leaflet p-4">
      {!identity ? (
        <div className="flex flex-col items-center gap-3 max-w-sm w-full text-center">
          <h2>Log in to get Leaflet Pro</h2>
          <div className="text-secondary leading-snug">
            You'll be redirected to checkout after you sign in.
          </div>
          <ProCheckoutLogin redirectRoute={redirectRoute} />
        </div>
      ) : (
        <ProCheckoutTrigger cadence={cadence} coupon={coupon} />
      )}
    </div>
  );
}
