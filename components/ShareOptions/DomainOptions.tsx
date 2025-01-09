import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { Radio } from "components/Checkbox";
import { ShareMenuStates } from ".";

import { AddTiny } from "components/Icons";
import { useSmoker, useToaster } from "components/Toast";
import { Input, InputWithLabel } from "components/Input";

export const DomainOptions = (props: {
  setMenuState: (state: ShareMenuStates) => void;
  domainConnected: boolean;
}) => {
  let [checked, setChecked] = useState<string | undefined>(undefined);

  let toaster = useToaster();
  let smoker = useSmoker();
  let domains = [
    "cozylittle.house",
    "awarm.space",
    "very-very-very-very-long-custom-domain.com",
  ];
  return (
    <div className="px-3 py-1 flex flex-col gap-3 max-w-full w-[600px]">
      <h3 className="text-secondary">Choose a Domain</h3>
      <div className="flex flex-col gap-1">
        {domains.map((domain) => {
          return (
            <DomainOption
              key={domain}
              domain={domain}
              checked={checked === domain}
              setChecked={setChecked}
              setMenuState={props.setMenuState}
            />
          );
        })}
        <h4 className="text-secondary mt-2">Pending Domains</h4>
        {domains.map((domain) => {
          return (
            <DomainOption
              key={domain + "pending"}
              pending
              domain={domain}
              checked={false}
              setChecked={setChecked}
              setMenuState={props.setMenuState}
            />
          );
        })}
        <hr className="border-border-light my-1" />
        <button
          onMouseDown={() => {
            props.setMenuState("addDomain");
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
              props.setMenuState("default");
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
          disabled={checked === undefined}
          onClick={() => {
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

            toaster({
              content: (
                <div className="font-bold">
                  Published to custom domain!{" "}
                  <a className="underline text-accent-2" href="/">
                    View
                  </a>
                </div>
              ),
              type: "success",
            });
            props.setMenuState("default");
          }}
        >
          Publish!
        </ButtonPrimary>
      </div>
    </div>
  );
};

const DomainOption = (props: {
  checked: boolean;
  setChecked: (checked: string) => void;
  domain: string;
  pending?: boolean;
  setMenuState: (state: ShareMenuStates) => void;
}) => {
  let [value, setValue] = useState("");
  return (
    <label htmlFor={props.domain}>
      <input
        type="radio"
        name={props.domain}
        id={props.domain}
        value={props.domain}
        checked={props.checked}
        className="hidden appearance-none"
        onChange={() => props.setChecked(props.domain)}
      />
      <div
        className={`
          px-[6px] py-1
          flex
          border rounded-md
          ${
            props.pending
              ? "border-border-light text-secondary justify-between gap-2 items-center "
              : !props.checked
                ? "flex-wrap border-border-light"
                : "flex-wrap border-accent-1 bg-accent-1 text-accent-2 font-bold"
          } `}
      >
        <div className={`w-max truncate ${props.pending && "animate-pulse"}`}>
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
              onChange={(e) => setValue(e.target.value)}
              value={value}
            />
          </div>
        )}
        {props.pending && (
          <button
            className="text-accent-contrast text-sm"
            onMouseDown={() => {
              props.setMenuState("addDomain");
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
  setMenuState: (state: ShareMenuStates) => void;
}) => {
  let [value, setValue] = useState("");
  let [addDomainState, setAddDomainState] = useState<"domainInput" | "DNSInfo">(
    "DNSInfo",
  );
  return (
    <div className="flex flex-col gap-1 px-3 py-1 max-w-full w-[600px]">
      {addDomainState === "domainInput" ? (
        <>
          <h3 className="text-secondary">Add a New Domain</h3>

          <Input
            className="input-with-border"
            placeholder="www.example.com"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <ButtonPrimary
            disabled={!value}
            className="place-self-end mt-2"
            onMouseDown={() => {
              setAddDomainState("DNSInfo");
            }}
          >
            Verify Domain
          </ButtonPrimary>
        </>
      ) : (
        <>
          <h3 className="text-secondary">Verify Domain</h3>

          <div className="text-secondary text-sm flex flex-col gap-3">
            <div className="flex flex-col gap-[6px]">
              <div>
                To verify this domain, add the following record to your DNS
                provider for <strong>{value}</strong>.
              </div>

              <div className="flex gap-3 p-1 border border-border-light rounded-md py-1">
                <div className="flex flex-col ">
                  <div className="text-tertiary">Type</div>
                  <div>CNAME</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-tertiary">Name</div>
                  <div>@</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-tertiary">Value</div>
                  <div>cname.vercel-dns.com</div>
                </div>
              </div>
            </div>
            <div>
              Once you do this, your provider may be pending for up to a few
              hours.
            </div>
            <div>Check back later to see if verfication was successful.</div>
          </div>

          <div className="flex gap-3 justify-between items-center mt-2">
            <button
              className="text-accent-contrast font-bold "
              onMouseDown={() => {
                props.setMenuState("chooseDomain");
                setValue("");
              }}
            >
              Delete Domain
            </button>
            <ButtonPrimary
              onMouseDown={() => {
                props.setMenuState("chooseDomain");
                setValue("");
              }}
            >
              Back to Domains
            </ButtonPrimary>
          </div>
        </>
      )}
    </div>
  );
};
