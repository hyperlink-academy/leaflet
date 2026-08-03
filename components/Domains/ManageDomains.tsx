"use client";
import { useState } from "react";
import { DomainList } from "./DomainList";
import { AddDomainForm } from "./AddDomainForm";
import { DomainSettingsView } from "./DomainSettingsView";
import { ButtonPrimary } from "components/Buttons";

type State =
  | "list"
  | "add-domain"
  | { type: "domain-settings"; domain: string };

export function ManageDomainsContent() {
  let [state, setState] = useState<State>("list");

  if (state === "add-domain")
    return (
      <AddDomainForm
        onDomainAdded={(domain) =>
          setState({ type: "domain-settings", domain })
        }
        onBack={() => setState("list")}
      />
    );

  if (typeof state === "object" && state.type === "domain-settings")
    return (
      <DomainSettingsView
        domain={state.domain}
        onBack={() => setState("list")}
        onRemoveAssignment={() => setState("list")}
        onDeleteDomain={() => setState("list")}
      />
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <h3>Domains</h3>

        <ButtonPrimary onClick={() => setState("add-domain")}>
          Add
        </ButtonPrimary>
      </div>
      <DomainList
        onSelectDomain={(domain) =>
          setState({ type: "domain-settings", domain })
        }
      />
    </div>
  );
}
