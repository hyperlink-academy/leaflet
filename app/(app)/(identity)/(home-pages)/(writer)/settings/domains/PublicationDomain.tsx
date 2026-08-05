"use client";
import { removeDomainAssignment } from "actions/domains";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import type { CustomDomain } from "./DomainList";
import { UnassignButton } from "./UnassignButton";
import { DomainVerification } from "./DomainVerification";
import { DeleteDomainButton } from "./DeleteDomainButton";
import { domainRowButton, domainRowBody } from "./domainRowStyles";

export function PublicationDomain(props: { domain: CustomDomain }) {
  let { mutate: mutateIdentity } = useIdentityData();
  let domain = props.domain.domain;
  let pubName =
    props.domain.publication_domains[0]?.publications?.name ??
    "Unnamed Publication";
  return (
    <>
      <div className="flex flex-row gap-2 w-full">
        <div className="grow flex items-start gap-2 min-1-0">
          <div className="truncate font-bold">{domain}</div>
          <div className="truncate text-tertiary min-w-0">- {pubName}</div>
        </div>
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
      <hr className="last:hidden" />
    </>
  );
}
