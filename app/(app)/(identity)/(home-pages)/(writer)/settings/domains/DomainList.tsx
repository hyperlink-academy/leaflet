"use client";
import { useIdentityData } from "components/IdentityProvider";
import { getDomainAssignment } from "./domainAssignment";
import { Identity } from "components/IdentityProvider";
import { EmptyState } from "components/EmptyState";
import { PublicationDomain } from "./PublicationDomain";
import { LeafletDomain } from "./LeafletDomain";
import { UnassignedDomain } from "./UnassignedDomain";
import { SettingsSection } from "components/SettingsLayout";
import { ButtonPrimary } from "components/Buttons";
import { AddDomainForm } from "./AddDomainForm";
import { Modal } from "components/Modal";

export type CustomDomain = NonNullable<Identity>["custom_domains"][number];

export function DomainList(props: {
  filter?: (domain: CustomDomain) => boolean;
}) {
  let { identity } = useIdentityData();
  let domains = identity?.custom_domains || [];
  if (props.filter) domains = domains.filter(props.filter);

  let pubDomains = domains.filter(
    (d) => getDomainAssignment(d).type === "publication",
  );
  let leafletDomains = domains.filter(
    (d) => getDomainAssignment(d).type === "document",
  );
  let unassignedDomains = domains.filter(
    (d) => getDomainAssignment(d).type === "unassigned",
  );

  if (domains.length === 0) {
    return <EmptyState container="none" title="no domains yet…" />;
  }

  return (
    <>
      {pubDomains.length > 0 && (
        <SettingsSection title="Publications">
          <div className="flex flex-col gap-2">
            {pubDomains.map((domain) => (
              <PublicationDomain key={domain.domain} domain={domain} />
            ))}
          </div>
        </SettingsSection>
      )}

      {leafletDomains.length > 0 && (
        <SettingsSection title="Leaflets">
          <div className="flex flex-col gap-2">
            {leafletDomains.map((domain) => (
              <LeafletDomain key={domain.domain} domain={domain} />
            ))}
          </div>
        </SettingsSection>
      )}
      {unassignedDomains.length > 0 && (
        <SettingsSection title="Unassigned Domains">
          <p>Assign domains in the leaflet settings or publication settings.</p>
          <div className="flex flex-col gap-2">
            {unassignedDomains.map((domain) => (
              <>
                {" "}
                <UnassignedDomain key={domain.domain} domain={domain} />
                <hr className="last:hidden" />
              </>
            ))}
          </div>
          <Modal
            asChild
            trigger={<ButtonPrimary fullWidth>Add New Domain</ButtonPrimary>}
          >
            <AddDomainForm />
          </Modal>
        </SettingsSection>
      )}
    </>
  );
}
