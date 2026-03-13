import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import { useDomainStatus } from "components/Domains/useDomainStatus";
import { CustomDomain } from "components/Domains/DomainList";
import {
  getDomainAssignment,
  describeAssignment,
} from "components/Domains/domainAssignment";
import { useLeafletDomains } from "components/PageSWRDataProvider";
import { useReadOnlyShareLink } from ".";
import { assignDomainToDocument } from "actions/domains/assignDomainToDocument";
import { useReplicache } from "src/replicache";
import { AddDomainForm } from "components/Domains/AddDomainForm";
import { DomainSettingsView } from "components/Domains/DomainSettingsView";
import { AddTiny } from "components/Icons/AddTiny";

type DomainMenuState =
  | { state: "default" }
  | { state: "domain-settings"; domain: string }
  | { state: "add-domain" }
  | { state: "has-domain"; domain: string };

export function CustomDomainMenu(props: {
  setShareMenuState: (s: "default") => void;
}) {
  let { data: domains } = useLeafletDomains();
  let [state, setState] = useState<DomainMenuState>(
    domains?.[0]
      ? { state: "has-domain", domain: domains[0].domain }
      : { state: "default" },
  );
  switch (state.state) {
    case "has-domain":
    case "default":
      return (
        <DomainOptions
          setDomainMenuState={setState}
          domainConnected={false}
          setShareMenuState={props.setShareMenuState}
        />
      );
    case "domain-settings":
      return (
        <div className="px-3 py-1 max-w-full w-[600px]">
          <DomainSettingsView
            domain={state.domain}
            onBack={() => setState({ state: "default" })}
            onRemoveAssignment={() => setState({ state: "default" })}
            onDeleteDomain={() => setState({ state: "default" })}
          />
        </div>
      );
    case "add-domain":
      return (
        <div className="px-3 py-1 max-w-full w-[600px]">
          <AddDomainForm
            onDomainAdded={(domain) =>
              setState({ state: "domain-settings", domain })
            }
            onBack={() => setState({ state: "default" })}
          />
        </div>
      );
  }
}

const DomainOptions = (props: {
  setShareMenuState: (s: "default") => void;
  setDomainMenuState: (state: DomainMenuState) => void;
  domainConnected: boolean;
}) => {
  let { data: domains, mutate: mutateDomains } = useLeafletDomains();
  let [selectedDomain, setSelectedDomain] = useState<string | undefined>(
    domains?.[0]?.domain,
  );
  let [selectedRoute, setSelectedRoute] = useState(
    domains?.[0]?.route.slice(1) || "",
  );
  let { identity, mutate: mutateIdentity } = useIdentityData();
  let { permission_token } = useReplicache();

  let toaster = useToaster();
  let publishLink = useReadOnlyShareLink();

  // Find the CustomDomain object for the selected domain to check its assignment
  let selectedDomainData = identity?.custom_domains.find(
    (d: CustomDomain) => d.domain === selectedDomain,
  );
  let selectedAssignment = selectedDomainData
    ? getDomainAssignment(selectedDomainData)
    : null;
  let willReassign =
    selectedAssignment && selectedAssignment.type !== "unassigned";

  let [confirmingReassign, setConfirmingReassign] = useState(false);

  async function doPublish() {
    if (!selectedDomain || !publishLink) return;
    await assignDomainToDocument({
      domain: selectedDomain,
      route: "/" + selectedRoute,
      view_permission_token: publishLink,
      edit_permission_token: permission_token.id,
    });

    toaster({
      content: (
        <div className="font-bold">
          Published to custom domain!{" "}
          <a
            className="underline text-accent-2"
            href={`https://${selectedDomain}/${selectedRoute}`}
            target="_blank"
          >
            View
          </a>
        </div>
      ),
      type: "success",
    });
    mutateIdentity();
    mutateDomains();
    setConfirmingReassign(false);
    props.setShareMenuState("default");
  }

  return (
    <div className="px-3 py-1 flex flex-col gap-3 max-w-full w-[600px]">
      <h3 className="text-secondary">Choose a Domain</h3>
      <div className="flex flex-col gap-1 text-secondary">
        {identity?.custom_domains.map((domain: CustomDomain) => {
          return (
            <DomainOption
              selectedRoute={selectedRoute}
              setSelectedRoute={setSelectedRoute}
              key={domain.domain}
              domain={domain}
              checked={selectedDomain === domain.domain}
              setChecked={(d) => {
                setSelectedDomain(d);
                setConfirmingReassign(false);
              }}
              setDomainMenuState={props.setDomainMenuState}
            />
          );
        })}
        <button
          onMouseDown={() => {
            props.setDomainMenuState({ state: "add-domain" });
          }}
          className="text-accent-contrast flex gap-2 items-center px-1 py-0.5"
        >
          <AddTiny /> Add a New Domain
        </button>
      </div>

      {confirmingReassign && selectedAssignment && (
        <div className="text-sm border border-accent-contrast rounded-md p-2 flex flex-col gap-2">
          <p className="text-secondary">
            <strong>{selectedDomain}</strong> is currently assigned to{" "}
            {describeAssignment(selectedAssignment)}. Publishing here will
            remove that assignment.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              className="text-accent-contrast text-sm"
              onMouseDown={() => setConfirmingReassign(false)}
            >
              Cancel
            </button>
            <ButtonPrimary compact onMouseDown={doPublish}>
              Reassign & Publish
            </ButtonPrimary>
          </div>
        </div>
      )}

      {!confirmingReassign && (
        <div className="flex gap-3 items-center justify-end">
          {props.domainConnected && (
            <button
              onMouseDown={() => {
                props.setShareMenuState("default");
                toaster({
                  content: (
                    <div className="font-bold">
                      Unpublished from custom domain!
                    </div>
                  ),
                  type: "error",
                });
              }}
            >
              Unpublish
            </button>
          )}

          <ButtonPrimary
            id="publish-to-domain"
            disabled={
              domains?.[0]
                ? domains[0].domain === selectedDomain &&
                  domains[0].route.slice(1) === selectedRoute
                : !selectedDomain
            }
            onClick={async () => {
              if (willReassign) {
                setConfirmingReassign(true);
                return;
              }
              await doPublish();
            }}
          >
            Publish!
          </ButtonPrimary>
        </div>
      )}
    </div>
  );
};

const DomainOption = (props: {
  selectedRoute: string;
  setSelectedRoute: (s: string) => void;
  checked: boolean;
  setChecked: (checked: string) => void;
  domain: CustomDomain;
  setDomainMenuState: (state: DomainMenuState) => void;
}) => {
  let [value, setValue] = useState("");
  let { pending } = useDomainStatus(props.domain.domain);
  let assignment = getDomainAssignment(props.domain);
  let assignedElsewhere = assignment.type !== "unassigned";

  return (
    <label htmlFor={props.domain.domain}>
      <input
        type="radio"
        name={props.domain.domain}
        id={props.domain.domain}
        value={props.domain.domain}
        checked={props.checked}
        className="hidden appearance-none"
        onChange={() => {
          if (pending) return;
          props.setChecked(props.domain.domain);
        }}
      />
      <div
        className={`
          px-[6px] py-1
          flex
          border rounded-md
          ${
            pending
              ? "border-border-light text-secondary justify-between gap-2 items-center "
              : !props.checked
                ? `flex-wrap border-border-light ${assignedElsewhere ? "opacity-70" : ""}`
                : "flex-wrap border-accent-1 bg-accent-1 text-accent-2 font-bold"
          } `}
      >
        <div className="flex justify-between w-full items-center">
          <div className={`w-max truncate ${pending && "animate-pulse"}`}>
            {props.domain.domain}
          </div>
          {!props.checked && assignedElsewhere && !pending && (
            <span className="text-xs text-tertiary">
              {describeAssignment(assignment)}
            </span>
          )}
        </div>
        {props.checked && (
          <div className="flex gap-0 w-full">
            <span
              className="font-normal"
              style={value === "" ? { opacity: "0.5" } : {}}
            >
              /
            </span>

            <Input
              type="text"
              autoFocus
              className="appearance-none focus:outline-hidden font-normal text-accent-2 w-full bg-transparent placeholder:text-accent-2 placeholder:opacity-50"
              placeholder="add-optional-path"
              onChange={(e) => props.setSelectedRoute(e.target.value)}
              value={props.selectedRoute}
            />
          </div>
        )}
        {pending && (
          <button
            className="text-accent-contrast text-sm"
            onMouseDown={() => {
              props.setDomainMenuState({
                state: "domain-settings",
                domain: props.domain.domain,
              });
            }}
          >
            pending
          </button>
        )}
      </div>
    </label>
  );
};
