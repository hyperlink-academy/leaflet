"use client";
import { useState } from "react";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { DomainList } from "./DomainList";
import { AddDomainForm } from "./AddDomainForm";
import { DomainSettingsView } from "./DomainSettingsView";

type State =
  | "list"
  | "add-domain"
  | { type: "domain-settings"; domain: string };

export function ManageDomains(props: { backToMenu: () => void }) {
  let [state, setState] = useState<State>("list");

  if (state === "add-domain") {
    return (
      <div className="px-3 py-1">
        <AddDomainForm
          onDomainAdded={(domain) =>
            setState({ type: "domain-settings", domain })
          }
          onBack={() => setState("list")}
        />
      </div>
    );
  }

  if (typeof state === "object" && state.type === "domain-settings") {
    return (
      <div className="px-3 py-1">
        <DomainSettingsView
          domain={state.domain}
          onBack={() => setState("list")}
          onRemoveAssignment={() => setState("list")}
          onDeleteDomain={() => setState("list")}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between font-bold text-secondary bg-border-light -mx-3 -mt-2 px-3 py-2 mb-1 flex-shrink-0">
        My Domains
        <button type="button" onClick={props.backToMenu}>
          <GoBackSmall className="text-accent-contrast" />
        </button>
      </div>
      <DomainList
        onSelectDomain={(domain) =>
          setState({ type: "domain-settings", domain })
        }
        onAddDomain={() => setState("add-domain")}
      />
    </div>
  );
}
