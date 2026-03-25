import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { Input } from "components/Input";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import { useDomainStatus } from "components/Domains/useDomainStatus";
import { CustomDomain } from "components/Domains/DomainList";
import { useLeafletDomains } from "components/PageSWRDataProvider";
import { useReadOnlyShareLink } from ".";
import {
  assignDomainToDocument,
  removeDomainRoute,
} from "actions/domains";
import { useReplicache } from "src/replicache";
import { AddDomainForm } from "components/Domains/AddDomainForm";
import { DomainSettingsView } from "components/Domains/DomainSettingsView";
import { DotLoader } from "components/utils/DotLoader";
import { GoToArrow } from "components/Icons/GoToArrow";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import Link from "next/link";

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
          setShareMenuState={props.setShareMenuState}
        />
      );
    case "domain-settings":
      return (
        <div className="">
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
        <AddDomainForm
          onDomainAdded={(domain) =>
            setState({ state: "domain-settings", domain })
          }
          onBack={() => setState({ state: "default" })}
        />
      );
  }
}

const DomainOptions = (props: {
  setShareMenuState: (s: "default") => void;
  setDomainMenuState: (state: DomainMenuState) => void;
}) => {
  let { data: domains, mutate: mutateDomains } = useLeafletDomains();
  let [selectedDomain, setSelectedDomain] = useState<string | undefined>(
    undefined,
  );
  let [selectedRoute, setSelectedRoute] = useState("");
  let { identity, mutate: mutateIdentity } = useIdentityData();
  let { permission_token } = useReplicache();

  let [loading, setLoading] = useState(false);
  let toaster = useToaster();
  let publishLink = useReadOnlyShareLink();

  // Filter out domains assigned to publications
  let allDomains = (identity?.custom_domains || []).filter(
    (d: CustomDomain) => d.publication_domains.length === 0,
  );

  // Categorize domains
  let linkedDomains = allDomains.filter((d: CustomDomain) =>
    d.custom_domain_routes.some(
      (r) => r.edit_permission_token === permission_token.id,
    ),
  );
  let pendingDomainsList: CustomDomain[] = [];
  let availableDomainsList: CustomDomain[] = [];

  // We'll categorize in the render since pending requires a hook per domain
  let nonLinkedDomains = allDomains.filter(
    (d: CustomDomain) =>
      !d.custom_domain_routes.some(
        (r) => r.edit_permission_token === permission_token.id,
      ),
  );

  // Check if the selected route is already assigned to a different leaflet
  let routeConflict = (() => {
    if (!selectedDomain) return false;
    let domain = allDomains.find(
      (d: CustomDomain) => d.domain === selectedDomain,
    );
    if (!domain) return false;
    let route = "/" + selectedRoute;
    return domain.custom_domain_routes.some(
      (r) =>
        r.route === route && r.edit_permission_token !== permission_token.id,
    );
  })();

  async function doPublish() {
    if (!selectedDomain || !publishLink) return;
    setLoading(true);
    let route = "/" + selectedRoute;

    mutateIdentityData(mutateIdentity, (draft) => {
      let domain = draft.custom_domains.find(
        (d) => d.domain === selectedDomain,
      );
      if (domain) {
        domain.custom_domain_routes = [
          ...domain.custom_domain_routes.filter(
            (r) => r.edit_permission_token !== permission_token.id,
          ),
          {
            id: crypto.randomUUID(),
            domain: selectedDomain,
            route,
            view_permission_token: publishLink,
            edit_permission_token: permission_token.id,
            created_at: new Date().toISOString(),
          },
        ];
      }
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
    mutateDomains();
    props.setShareMenuState("default");

    await assignDomainToDocument({
      domain: selectedDomain,
      route,
      view_permission_token: publishLink,
      edit_permission_token: permission_token.id,
    });
  }

  return (
    <div className="px-2 py-1 flex flex-col gap-2 max-w-full w-[600px]">
      <div className="flex justify-between">
        <h4>Choose a Domain</h4>
        <button
          className="text-accent-contrast rotate-180"
          onClick={() => props.setShareMenuState("default")}
        >
          <GoToArrow />
        </button>
      </div>
      <hr className="border-border-light -mx-3" />
      <div className="flex flex-col gap-1 text-secondary">
        {linkedDomains.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {linkedDomains.map((domain: CustomDomain) => (
              <LinkedDomainOption
                key={domain.domain}
                domain={domain}
                permission_token_id={permission_token.id}
                onUnlink={async (routeId: string) => {
                  mutateIdentityData(mutateIdentity, (draft) => {
                    let d = draft.custom_domains.find(
                      (dd) => dd.domain === domain.domain,
                    );
                    if (d) {
                      d.custom_domain_routes = d.custom_domain_routes.filter(
                        (r) => r.id !== routeId,
                      );
                    }
                  });
                  mutateDomains();
                  toaster({
                    content: (
                      <div className="font-bold">
                        Unpublished from custom domain!
                      </div>
                    ),
                    type: "success",
                  });
                  await removeDomainRoute({ routeId });
                }}
              />
            ))}
          </div>
        )}
        {nonLinkedDomains.length > 0 && (
          <NonLinkedDomains
            domains={nonLinkedDomains}
            selectedDomain={selectedDomain}
            setSelectedDomain={setSelectedDomain}
            selectedRoute={selectedRoute}
            setSelectedRoute={setSelectedRoute}
            setDomainMenuState={props.setDomainMenuState}
          />
        )}
        <div className="text-sm text-tertiary leading-snug pt-1">
          You can add or delete domains from profile settings on{" "}
          <Link href="/home" className="text-accent-contrast">
            home
          </Link>
        </div>
      </div>

      {routeConflict && (
        <p className="text-error text-sm">Route already assigned</p>
      )}
      <ButtonPrimary
        id="publish-to-domain"
        className="place-self-end"
        disabled={loading || routeConflict || !selectedDomain}
        onClick={doPublish}
      >
        {loading ? <DotLoader /> : "Publish!"}
      </ButtonPrimary>
    </div>
  );
};

const LinkedDomainOption = (props: {
  domain: CustomDomain;
  permission_token_id: string;
  onUnlink: (routeId: string) => void;
}) => {
  let route = props.domain.custom_domain_routes.find(
    (r) => r.edit_permission_token === props.permission_token_id,
  );
  if (!route) return null;

  return (
    <div className="text-sm flex justify-between px-1 py-0.5 bg-accent-1 text-accent-2 rounded-md">
      <div className="font-bold w-full truncate">
        {props.domain.domain}
        <span className="font-normal">{route.route}</span>
      </div>
      <button onClick={() => props.onUnlink(route.id)}>
        <UnlinkTiny />
      </button>
    </div>
  );
};

function NonLinkedDomains(props: {
  domains: CustomDomain[];
  selectedDomain: string | undefined;
  setSelectedDomain: (d: string) => void;
  selectedRoute: string;
  setSelectedRoute: (r: string) => void;
  setDomainMenuState: (state: DomainMenuState) => void;
}) {
  // Separate pending vs available using hooks rendered per-domain
  return (
    <>
      {props.domains.map((domain) => (
        <NonLinkedDomainRow
          key={domain.domain}
          domain={domain}
          selectedDomain={props.selectedDomain}
          setSelectedDomain={props.setSelectedDomain}
          selectedRoute={props.selectedRoute}
          setSelectedRoute={props.setSelectedRoute}
          setDomainMenuState={props.setDomainMenuState}
        />
      ))}
    </>
  );
}

function NonLinkedDomainRow(props: {
  domain: CustomDomain;
  selectedDomain: string | undefined;
  setSelectedDomain: (d: string) => void;
  selectedRoute: string;
  setSelectedRoute: (r: string) => void;
  setDomainMenuState: (state: DomainMenuState) => void;
}) {
  let { pending } = useDomainStatus(props.domain.domain);

  if (pending) {
    return (
      <div className="text-sm flex px-1 py-0.5 border block-border !rounded-md text-secondary">
        <div className="font-bold">{props.domain.domain}/</div>
        <Input
          disabled
          value=""
          className="w-full bg-transparent appearance-none focus:!outline-none"
          placeholder=""
        />
        <button
          className="text-accent-contrast text-sm"
          onMouseDown={() =>
            props.setDomainMenuState({
              state: "domain-settings",
              domain: props.domain.domain,
            })
          }
        >
          <LoadingTiny className="animate-spin text-accent-contrast" />
        </button>
      </div>
    );
  }

  let isSelected = props.selectedDomain === props.domain.domain;

  return (
    <div
      className={`text-sm flex px-1 py-0.5 border block-border !rounded-md cursor-pointer ${isSelected ? "!outline-accent-contrast !border-accent-contrast" : ""}`}
      onClick={() => props.setSelectedDomain(props.domain.domain)}
    >
      <div className="font-bold">{props.domain.domain}/</div>
      <Input
        value={isSelected ? props.selectedRoute : ""}
        onChange={(e) => props.setSelectedRoute(e.currentTarget.value)}
        className="w-full bg-transparent appearance-none focus:!outline-none"
        placeholder={isSelected ? "optional path" : ""}
        onFocus={() => props.setSelectedDomain(props.domain.domain)}
      />
    </div>
  );
}
