"use client";
import { useState } from "react";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { DomainList } from "./DomainList";
import { AddDomainForm } from "./AddDomainForm";
import { DomainSettingsView } from "./DomainSettingsView";
import { GoToArrow } from "components/Icons/GoToArrow";

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
    <div className="flex flex-col gap-2 px-3 pt-1 pb-3">
      <div className="flex justify-between">
        <h4>Connected Domains</h4>
        <button
          className="text-accent-contrast rotate-180"
          onClick={props.backToMenu}
          type="button"
        >
          <GoToArrow />
        </button>
      </div>
      <hr className="border-border-light -mx-3" />
      <DomainList
        onSelectDomain={(domain) =>
          setState({ type: "domain-settings", domain })
        }
        onAddDomain={() => setState("add-domain")}
      />
    </div>
  );
}
