"use client";
import { useState } from "react";
import { DomainList } from "./DomainList";
import { AddDomainForm } from "./AddDomainForm";
import { DomainSettingsView } from "./DomainSettingsView";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { WebSmall } from "components/Icons/WebSmall";

type State =
  | "list"
  | "add-domain"
  | { type: "domain-settings"; domain: string };

export function ManageDomains(props: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  let [state, setState] = useState<State>("list");
  return (
    <Modal
      className="w-fill max-w-full sm:max-w-md w-[10000px] "
      open={props.open}
      onOpenChange={props.onOpenChange}
      trigger={
        props.open === undefined ? (
          <div className="menuItem -mx-[8px] ">
            <WebSmall />
            Domain Settings
          </div>
        ) : undefined
      }
    >
      {state === "add-domain" ? (
        <AddDomainForm
          onDomainAdded={(domain) =>
            setState({ type: "domain-settings", domain })
          }
          onBack={() => setState("list")}
        />
      ) : typeof state === "object" && state.type === "domain-settings" ? (
        <DomainSettingsView
          domain={state.domain}
          onBack={() => setState("list")}
          onRemoveAssignment={() => setState("list")}
          onDeleteDomain={() => setState("list")}
        />
      ) : (
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
      )}
    </Modal>
  );
}
