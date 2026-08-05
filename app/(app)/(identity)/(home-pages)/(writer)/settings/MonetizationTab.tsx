import { ConnectStripeSection } from "app/(app)/(identity)/lish/[did]/[publication]/dashboard/settings/MonetizationSettings";
import { GoToArrow } from "components/Icons/GoToArrow";
import { useIdentityData } from "components/IdentityProvider";
import { SettingsSection } from "components/SettingsLayout";
import { SpeedyLink } from "components/SpeedyLink";
import { MonetizationPub } from "./SettingsPageContent";

export function MonetizationTab(props: { pubs: MonetizationPub[] }) {
  let { identity } = useIdentityData();
  let chargesEnabled = !!identity?.connectedAccount?.charges_enabled;

  return (
    <>
      <ConnectStripeSection />
      {chargesEnabled && (
        <SettingsSection title="Monetized Publications">
          Enable and disable monetization in your publication settings
          {props.pubs.length === 0 ? (
            <div className="text-tertiary text-sm">No publications yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {props.pubs.map((pub) => (
                <SpeedyLink
                  key={pub.uri}
                  href={pub.settingsHref}
                  className="no-underline! flex items-center justify-between gap-3 border border-border-light rounded-md px-3 py-2 hover:border-accent-contrast"
                >
                  <div className="font-bold text-primary grow truncate min-w-0">
                    {pub.name || "Untitled Publication"}
                  </div>
                  {pub.monetizationEnabled ? (
                    <div className="text-sm shrink-0 text-accent-contrast font-bold">
                      ON
                    </div>
                  ) : (
                    <div className="text-sm shrink-0 text-tertiary">OFF</div>
                  )}
                  <GoToArrow className="text-accent-contrast shrink-0" />
                </SpeedyLink>
              ))}
            </div>
          )}
        </SettingsSection>
      )}
    </>
  );
}
