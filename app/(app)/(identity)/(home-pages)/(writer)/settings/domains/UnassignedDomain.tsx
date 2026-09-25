"use client";
import type { CustomDomain } from "./DomainTab";
import { useDomainStatus } from "./useDomainStatus";
import { DomainVerificationModal } from "./DomainVerification";
import { DeleteDomainButton } from "./DeleteDomainButton";

export function UnassignedDomain(props: { domain: CustomDomain }) {
  let domain = props.domain.domain;
  let { pending } = useDomainStatus(domain);

  if (pending)
    return (
      <DomainVerificationModal domain={domain}>
        <DeleteDomainButton domain={domain} />
      </DomainVerificationModal>
    );
  return (
    <div className="flex flex-row w-full items-center opaque-container px-2 py-1">
      <div className="grow truncate min-w-0 font-bold mr-2">{domain}</div>
      <DeleteDomainButton domain={domain} />
    </div>
  );
}
