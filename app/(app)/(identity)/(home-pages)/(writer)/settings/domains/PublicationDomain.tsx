"use client";
import { removeDomainAssignment } from "actions/domains";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import type { CustomDomain } from "./DomainTab";
import { UnassignButton } from "./UnassignButton";
import { DeleteDomainButton } from "./DeleteDomainButton";
import { SpeedyLink } from "components/SpeedyLink";

export function PublicationDomain(props: { domain: CustomDomain }) {
  let { mutate: mutateIdentity } = useIdentityData();
  let domain = props.domain.domain;
  let pubName =
    props.domain.publication_domains[0]?.publications?.name ??
    "Unnamed Publication";
  return (
    <div className="flex flex-row gap-2 w-full opaque-container px-2 py-1">
      <SpeedyLink
        href={domain}
        className="group hover:text-accent-contrast! hover:no-underline grow flex items-start gap-2 min-1-0 text-secondary"
      >
        <div className="truncate font-bold">{domain}</div>
        <div className="truncate italic text-tertiary group-hover:text-accent-contrast min-w-0">
          - {pubName}
        </div>
      </SpeedyLink>
      <UnassignButton
        linked={pubName}
        onUnassign={async () => {
          mutateIdentityData(mutateIdentity, (draft) => {
            let domainData = draft.custom_domains.find(
              (d) => d.domain === domain,
            );
            if (domainData) domainData.publication_domains = [];
          });
          await removeDomainAssignment({ domain });
        }}
      />

      <DeleteDomainButton domain={domain} />
    </div>
  );
}
