"use client";
import { useState } from "react";
import { useIdentityData } from "components/IdentityProvider";
import { getDomainAssignment } from "./domainAssignment";
import { Identity } from "components/IdentityProvider";
import { EmptyState } from "components/EmptyState";
import { PublicationDomain } from "./PublicationDomain";
import { LeafletDomain } from "./LeafletDomain";
import { UnassignedDomain } from "./UnassignedDomain";
import { SettingsSection } from "components/SettingsLayout";
import { ButtonPrimary } from "components/Buttons";
import { AddDomainModal } from "./AddDomainForm";
import { AddTiny } from "components/Icons/AddTiny";

export type CustomDomain = NonNullable<Identity>["custom_domains"][number];

export function DomainTab(props: {
  filter?: (domain: CustomDomain) => boolean;
}) {
  let { identity } = useIdentityData();
  let [addOpen, setAddOpen] = useState(false);
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

  let addDomainModal = (
    <AddDomainModal open={addOpen} onOpenChange={setAddOpen} />
  );

  if (domains.length === 0) {
    return (
      <>
        {addDomainModal}
        <EmptyState container="opaque" title="no domains yet…">
          <ButtonPrimary
            compact
            className=" mx-auto"
            onClick={() => setAddOpen(true)}
          >
            <AddTiny /> Add Domain
          </ButtonPrimary>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      {addDomainModal}
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

      <SettingsSection
        title="Unassigned Domains"
        action={
          <ButtonPrimary compact onClick={() => setAddOpen(true)}>
            <AddTiny /> Add Domain
          </ButtonPrimary>
        }
      >
        <p>Assign domains in the leaflet settings or publication settings.</p>
        <div className="flex flex-col gap-2">
          {unassignedDomains.map((domain) => (
            <UnassignedDomain key={domain.domain} domain={domain} />
          ))}
        </div>
      </SettingsSection>
    </>
  );
}
