"use client";
import { useState } from "react";
import { DomainTab } from "./DomainTab";
import { AddDomainForm } from "./AddDomainForm";
import { ButtonPrimary } from "components/Buttons";

export function ManageDomainsContent() {
  let [addingDomain, setAddingDomain] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <h3>Domains</h3>

        <ButtonPrimary onClick={() => setAddingDomain(true)}>Add</ButtonPrimary>
      </div>
      <DomainTab />
    </div>
  );
}
