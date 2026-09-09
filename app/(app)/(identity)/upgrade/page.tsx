import { getIdentityData } from "actions/getIdentityData";
import { isPro } from "src/entitlements";
import { ButtonPrimary } from "components/Buttons";
import { SpeedyLink } from "components/SpeedyLink";
import { UpgradeContent } from "app/(app)/(published)/lish/[did]/[publication]/UpgradeModal";
import { UpgradeAccountSwitcher } from "./UpgradeAccountSwitcher";
import { CurrentAccount } from "./CurrentAccount";

export const metadata = {
  title: "Get Leaflet Pro",
  description:
    "Analytics, email newsletters, and group publications for your Leaflet publication.",
};

export default async function UpgradePage() {
  let identity = await getIdentityData();

  let notSignedInContent = <UpgradeContent signedOut />;

  let alreadyProContent = (
    <div className="flex flex-col gap-2 text-center max-w-sm">
      <h2>You're already a Pro!</h2>
      <CurrentAccount />

      <div>This account already has a Pro subscription. Thank you! </div>
      <div className="flex flex-col gap-1 pt-2">
        <SpeedyLink href="/home" className="mx-auto">
          <ButtonPrimary>Go Back Home</ButtonPrimary>
        </SpeedyLink>
        <UpgradeAccountSwitcher />
      </div>
    </div>
  );

  return (
    <div className="upgradePage relative w-full h-full flex items-center justify-center p-4">
      <div className="mx-auto">
        {!identity ? (
          notSignedInContent
        ) : isPro(identity?.entitlements) ? (
          alreadyProContent
        ) : (
          <UpgradeContent />
        )}
      </div>
    </div>
  );
}
