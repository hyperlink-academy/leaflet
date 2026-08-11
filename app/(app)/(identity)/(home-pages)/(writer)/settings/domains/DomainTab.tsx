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
import { AddTiny } from "components/Icons/AddTiny";

export type CustomDomain = NonNullable<Identity>["custom_domains"][number];

export function DomainTab(props: {
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
    return (
      <EmptyState container="opaque" title="no domains yet…">
        <Modal
          asChild
          trigger={
            <ButtonPrimary compact className=" mx-auto">
              <AddTiny /> Add Domain
            </ButtonPrimary>
          }
        >
          <AddDomainForm />
        </Modal>
      </EmptyState>
    );
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

      <SettingsSection
        title="Unassigned Domains"
        action={
          <Modal
            asChild
            trigger={
              <ButtonPrimary compact className="">
                <AddTiny /> Add Domain
              </ButtonPrimary>
            }
          >
            <AddDomainForm />
          </Modal>
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
