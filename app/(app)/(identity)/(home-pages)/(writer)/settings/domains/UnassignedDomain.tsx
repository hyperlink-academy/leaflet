"use client";
import type { CustomDomain } from "./DomainList";
import { useDomainStatus } from "./useDomainStatus";
import { DomainVerification } from "./DomainVerification";
import { DeleteDomainButton } from "./DeleteDomainButton";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { AddDomainForm } from "./AddDomainForm";

export function UnassignedDomain(props: { domain: CustomDomain }) {
  let domain = props.domain.domain;

  return (
    <div>
      <div className="flex flex-col">
        <div className="flex flex-row w-full items-center">
          <div className="grow truncate min-w-0 font-bold">{domain}</div>
          <Modal
            title="Verify this Domain"
            className="max-w-md"
            trigger={
              <div className="text-sm shrink-0  text-tertiary animate-pulse mr-2">
                pending
              </div>
            }
          >
            <DomainVerification domain={domain} />
          </Modal>
          <DeleteDomainButton domain={domain} />
        </div>
      </div>
    </div>
  );
}
