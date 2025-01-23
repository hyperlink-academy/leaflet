import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";

import { AddTiny } from "components/Icons";
import { useSmoker, useToaster } from "components/Toast";
import { Input, InputWithLabel } from "components/Input";
import useSWR from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { addDomain } from "actions/domains/addDomain";
import { callRPC } from "app/api/rpc/client";
import { useLeafletDomains } from "components/PageSWRDataProvider";
import { usePublishLink } from ".";
import { addDomainPath } from "actions/domains/addDomainPath";
import { useReplicache } from "src/replicache";
import { deleteDomain } from "actions/domains/deleteDomain";

type DomainMenuState =
  | {
      state: "default";
    }
  | {
      state: "domain-settings";
      domain: string;
    }
  | {
      state: "add-domain";
    }
  | {
      state: "has-domain";
      domain: string;
    };
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
        <DomainSettings domain={state.domain} setDomainMenuState={setState} />
      );
    case "add-domain":
      return <AddDomain setDomainMenuState={setState} />;
  }
}

export const DomainOptions = (props: {
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
  let { identity } = useIdentityData();
  let { permission_token } = useReplicache();

  let toaster = useToaster();
  let smoker = useSmoker();
  let publishLink = usePublishLink();

  return (
    <div className="px-3 py-1 flex flex-col gap-3 max-w-full w-[600px]">
      <h3 className="text-secondary">Choose a Domain</h3>
      <div className="flex flex-col gap-1">
        {identity?.custom_domains.map((domain) => {
          return (
            <DomainOption
              selectedRoute={selectedRoute}
              setSelectedRoute={setSelectedRoute}
              key={domain.domain}
              domain={domain.domain}
              checked={selectedDomain === domain.domain}
              setChecked={setSelectedDomain}
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

      {/* ONLY SHOW IF A DOMAIN IS CURRENTLY CONNECTED */}
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
            // let rect = document
            //   .getElementById("publish-to-domain")
            //   ?.getBoundingClientRect();
            // smoker({
            //   error: true,
            //   text: "url already in use!",
            //   position: {
            //     x: rect ? rect.left : 0,
            //     y: rect ? rect.top + 26 : 0,
            //   },
            // });
            if (!selectedDomain || !publishLink) return;
            await addDomainPath({
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
            mutateDomains();
            props.setShareMenuState("default");
          }}
        >
          Publish!
        </ButtonPrimary>
      </div>
    </div>
  );
};

const DomainOption = (props: {
  selectedRoute: string;
  setSelectedRoute: (s: string) => void;
  checked: boolean;
  setChecked: (checked: string) => void;
  domain: string;
  setDomainMenuState: (state: DomainMenuState) => void;
}) => {
  let [value, setValue] = useState("");
  let { data } = useSWR(props.domain, async (domain) => {
    return await callRPC("get_domain_status", { domain });
  });
  let pending = data?.config?.misconfigured || data?.error;
  return (
    <label htmlFor={props.domain}>
      <input
        type="radio"
        name={props.domain}
        id={props.domain}
        value={props.domain}
        checked={props.checked}
        className="hidden appearance-none"
        onChange={() => {
          if (pending) return;
          props.setChecked(props.domain);
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
                ? "flex-wrap border-border-light"
                : "flex-wrap border-accent-1 bg-accent-1 text-accent-2 font-bold"
          } `}
      >
        <div className={`w-max truncate ${pending && "animate-pulse"}`}>
          {props.domain}
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
              className="appearance-none focus:outline-none font-normal text-accent-2 w-full bg-transparent placeholder:text-accent-2 placeholder:opacity-50"
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
                domain: props.domain,
              });
            }}
          >
            details
          </button>
        )}
      </div>
    </label>
  );
};

export const AddDomain = (props: {
  setDomainMenuState: (state: DomainMenuState) => void;
}) => {
  let [value, setValue] = useState("");
  let smoker = useSmoker();
  return (
    <div className="flex flex-col gap-1 px-3 py-1 max-w-full w-[600px]">
      <div>
        <h3 className="text-secondary">Add a New Domain</h3>
        <div className="text-xs italic text-secondary">
          Don't include the protocol or path, just the base domain name for now
        </div>
      </div>

      <Input
        className="input-with-border"
        placeholder="www.example.com"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <ButtonPrimary
        disabled={!value}
        className="place-self-end mt-2"
        onMouseDown={async (e) => {
          // call the vercel api, set the thing...
          let { error } = await addDomain(value);
          if (error) {
            smoker({
              error: true,
              text:
                error === "invalid_domain"
                  ? "Invalid domain! Use just the base domain"
                  : error === "domain_already_in_use"
                    ? "That domain is already in use!"
                    : "An unknown error occured",
              position: {
                y: e.clientY,
                x: e.clientX - 5,
              },
            });
            return;
          }
          props.setDomainMenuState({ state: "domain-settings", domain: value });
        }}
      >
        Verify Domain
      </ButtonPrimary>
    </div>
  );
};

const DomainSettings = (props: {
  domain: string;
  setDomainMenuState: (s: DomainMenuState) => void;
}) => {
  let isSubdomain = props.domain.split(".").length > 2;
  return (
    <div className="flex flex-col gap-1 px-3 py-1 max-w-full w-[600px]">
      <h3 className="text-secondary">Verify Domain</h3>

      <div className="text-secondary text-sm flex flex-col gap-3">
        <div className="flex flex-col gap-[6px]">
          <div>
            To verify this domain, add the following record to your DNS provider
            for <strong>{props.domain}</strong>.
          </div>

          {isSubdomain ? (
            <div className="flex gap-3 p-1 border border-border-light rounded-md py-1">
              <div className="flex flex-col ">
                <div className="text-tertiary">Type</div>
                <div>CNAME</div>
              </div>
              <div className="flex flex-col">
                <div className="text-tertiary">Name</div>
                <div>{props.domain.split(".").slice(0, -2).join(".")}</div>
              </div>
              <div className="flex flex-col">
                <div className="text-tertiary">Value</div>
                <div>cname.vercel-dns.com</div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 p-1 border border-border-light rounded-md py-1">
              <div className="flex flex-col ">
                <div className="text-tertiary">Type</div>
                <div>A</div>
              </div>
              <div className="flex flex-col">
                <div className="text-tertiary">Name</div>
                <div>@</div>
              </div>
              <div className="flex flex-col">
                <div className="text-tertiary">Value</div>
                <div>76.76.21.21</div>
              </div>
            </div>
          )}
        </div>
        <div>
          Once you do this, your provider may be pending for up to a few hours.
        </div>
        <div>Check back later to see if verfication was successful.</div>
      </div>

      <div className="flex gap-3 justify-between items-center mt-2">
        <button
          className="text-accent-contrast font-bold "
          onMouseDown={async () => {
            await deleteDomain({ domain: props.domain });
            props.setDomainMenuState({ state: "default" });
          }}
        >
          Delete Domain
        </button>
        <ButtonPrimary
          onMouseDown={() => {
            props.setDomainMenuState({ state: "default" });
          }}
        >
          Back to Domains
        </ButtonPrimary>
      </div>
    </div>
  );
};
