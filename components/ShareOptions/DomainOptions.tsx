import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";

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
import { AddTiny } from "components/Icons/AddTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { dummyDomains } from "app/home/AccountSettings";
import Link from "next/link";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";

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

  let [selectedDummyDomain, setSelectedDummyDomain] = useState<
    string | undefined
  >(undefined);

  let linkedDomains = dummyDomains?.filter((domain) => {
    return domain.type === "leaflet" && domain.state === "linked";
  });
  let availableDomains = dummyDomains?.filter((domain) => {
    return domain.type === "leaflet" && domain.state === "available";
  });
  let pendingDomains = dummyDomains?.filter((domain) => {
    return domain.type === "leaflet" && domain.state === "pending";
  });

  let [selectedRoute, setSelectedRoute] = useState(
    domains?.[0]?.route.slice(1) || "",
  );
  let { identity } = useIdentityData();
  let { permission_token } = useReplicache();

  let toaster = useToaster();
  let publishLink = usePublishLink();

  console.log(dummyDomains.filter((domain) => domain.type === "leaflet"));
  return (
    <div className="px-3 py-1 flex flex-col gap-2 max-w-full w-[600px]">
      <div className="flex justify-between">
        <h4 className="">Choose a Domain</h4>
        <button
          className="text-accent-contrast rotate-180"
          onClick={() => {
            props.setShareMenuState("default");
          }}
        >
          <GoToArrow />
        </button>
      </div>
      <hr className="border-border-light -mx-3" />
      <div className="flex flex-col gap-3 text-secondary">
        {/*{identity?.custom_domains
          .filter((d) => !d.publication_domains.length)
          .map((domain) => {
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
          })}*/}
        {linkedDomains.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <strong className="text-sm">Currently Linked</strong>
            {linkedDomains.map((domain) => {
              return (
                <DummyDomainOption
                  selectedDummyDomain={selectedDomain}
                  setSelectedDummyDomain={setSelectedDummyDomain}
                  domain={domain}
                />
              );
            })}
          </div>
        )}
        {availableDomains.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <strong className="text-sm">Available</strong>
            {availableDomains.map((domain) => {
              return (
                <DummyDomainOption
                  selectedDummyDomain={selectedDomain}
                  setSelectedDummyDomain={setSelectedDummyDomain}
                  domain={domain}
                />
              );
            })}
          </div>
        )}
        {pendingDomains.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <strong className="text-sm">Pending</strong>
            {pendingDomains.map((domain) => {
              return (
                <DummyDomainOption
                  selectedDummyDomain={selectedDomain}
                  setSelectedDummyDomain={setSelectedDummyDomain}
                  domain={domain}
                />
              );
            })}
          </div>
        )}
        <div className="text-sm text-tertiary">
          Add or delete domains from the account settings on{" "}
          <Link href="/home">home</Link>
        </div>

        {/*<button
          onMouseDown={() => {
            props.setDomainMenuState({ state: "add-domain" });
          }}
          className="text-accent-contrast text-sm flex justify-between gap-2 items-center px-1 py-0.5 border block-border hover:outline-accent-contrast !border-accent-contrast  !rounded-md font-bold my-2"
        >
          Add a New Domain <AddTiny />
        </button>*/}
      </div>

      <ButtonPrimary
        id="publish-to-domain"
        className="place-self-end"
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
  );
};

const DummyDomainOption = (props: {
  domain: {
    base_url: string;
    type: string;
    state: string;
    subdomains: {
      path: string;
      title: string;
    }[];
  };
  selectedDummyDomain?: string;
  setSelectedDummyDomain: (domain: string) => void;
}) => {
  let [pathValue, setPathValue] = useState("");

  if (props.domain.state === "linked") {
    return (
      <div
        className={`
        text-sm flex justify-between
        px-1 py-0.5
        bg-accent-1 text-accent-2 rounded-md`}
      >
        <div className="font-bold w-full truncate">
          {props.domain.base_url}
          <span className="font-normal">{props.domain.subdomains[0].path}</span>
        </div>
        <button>
          <UnlinkTiny />
        </button>
      </div>
    );
  }
  return (
    <div
      className={`
        text-sm flex
        px-1 py-0.5
        border  block-border !rounded-md

        ${props.selectedDummyDomain === props.domain.base_url ? "!outline-accent-contrast !border-accent-contrast" : ""}
        `}
      onClick={() => {
        props.setSelectedDummyDomain(props.domain.base_url);
      }}
    >
      <div className="font-bold">{props.domain.base_url}/</div>{" "}
      <Input
        value={pathValue}
        disabled={props.domain.state === "pending"}
        onChange={(e) => setPathValue(e.currentTarget.value)}
        className="w-full bg-transparent appearance-none focus:!outline-none"
        placeholder={
          props.selectedDummyDomain === props.domain.base_url
            ? "optional path"
            : ""
        }
      />
      {props.domain.state === "pending" && (
        <button
          className="text-accent-contrast text-sm"
          onMouseDown={() => {
            // props.setDomainMenuState({
            //   state: "domain-settings",
            //   domain: props.domain,
            // });
          }}
        >
          <LoadingTiny className="animate-spin text-accent-contrast group-hover/pending:text-accent-2 " />
        </button>
      )}
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
            pending
          </button>
        )}
      </div>
    </label>
  );
};

export const AddDomain = (props: {
  setDomainMenuState: (state: DomainMenuState) => void;
}) => {
  let [domainValue, setDomainValue] = useState("");
  let [pathValue, setPathValue] = useState("");

  let baseDomain = domainValue.replace(/^https?:\/\//, "").split("/")[0];

  let { mutate } = useIdentityData();
  let smoker = useSmoker();
  return (
    <div className="flex flex-col gap-2 px-3 py-1 max-w-full w-[600px]">
      <div className="flex justify-between">
        <h4 className="text-secondary ">Add a New Domain</h4>{" "}
        <button
          className="rotate-180 text-accent-contrast"
          onClick={() => props.setDomainMenuState({ state: "default" })}
        >
          <GoToArrow />
        </button>
      </div>
      <hr className="border-border-light -mx-3" />
      <div className="text-sm  text-secondary">
        <strong>Enter the just the base domain.</strong>
        <br />
        Once this domain is verified come back to link it to this leaflet.
      </div>
      <Input
        className="!outline-none w-full min-w-0 input-with-border"
        placeholder="www.example.com"
        value={domainValue}
        onChange={(e) => setDomainValue(e.target.value)}
      />

      <ButtonPrimary
        disabled={!domainValue}
        className="place-self-end mt-2"
        onMouseDown={async (e) => {
          // call the vercel api, set the thing...
          let { error } = await addDomain(baseDomain);
          if (error) {
            smoker({
              error: true,
              text:
                error === "invalid_domain"
                  ? "Invalid domain! Only inlcude the base domain"
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
          mutate();
          props.setDomainMenuState({
            state: "domain-settings",
            domain: domainValue,
          });
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
                <div style={{ wordBreak: "break-word" }}>
                  {props.domain.split(".").slice(0, -2).join(".")}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-tertiary">Value</div>
                <div style={{ wordBreak: "break-word" }}>
                  cname.vercel-dns.com
                </div>
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
          Once you do this, the status may be pending for up to a few hours.
        </div>
        <div>
          Check back later to see if verification was successful and to link it
          to this leaflet.
        </div>
      </div>

      <div className="flex gap-3 justify-between items-center mt-2">
        <button
          className="text-accent-contrast font-bold "
          onMouseDown={async () => {
            await deleteDomain({ domain: props.domain });
            props.setDomainMenuState({ state: "default" });
          }}
        >
          Cancel Verification
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
