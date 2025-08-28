"use client";

import { ActionButton } from "components/ActionBar/ActionButton";
import { mutate } from "swr";
import { AccountSmall } from "components/Icons/AccountSmall";
import { LogoutSmall } from "components/Icons/LogoutSmall";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import Link from "next/link";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import { useState } from "react";
import { useToaster } from "components/Toast";
import { Menu, MenuItem, Separator } from "components/Layout";
import { GoToArrow } from "components/Icons/GoToArrow";
import { WebSmall } from "components/Icons/WebSmall";

// it was going have a popover with a log out button
type state = "default" | "domains";

export const AccountSettings = () => {
  let [state, setState] = useState<state>("default");
  return (
    <Menu
      asChild
      side="right"
      align="start"
      trigger={<ActionButton icon=<AccountSmall /> label="Settings" />}
      className=" w-[1000px] max-w-xs"
    >
      {state === "domains" ? (
        <DomainOptions
          setState={(s) => {
            setState(s);
          }}
        />
      ) : (
        <DefaultOptions
          setState={(s) => {
            setState(s);
          }}
        />
      )}
    </Menu>
  );
};

const DefaultOptions = (props: { setState: (s: state) => void }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <MenuItem
        onSelect={(e) => {
          e.preventDefault();
          props.setState("domains");
        }}
      >
        <WebSmall />
        Connected Domains
      </MenuItem>
      <hr className="border-border-light my-1" />
      <MenuItem
        onSelect={async () => {
          await fetch("/api/auth/logout");
          mutate("identity", null);
        }}
      >
        <LogoutSmall />
        Logout
      </MenuItem>
    </div>
  );
};

const DomainOptions = (props: { setState: (s: state) => void }) => {
  let pubDomains = domains
    .filter((domain) => domain.type === "pub")
    .sort((a, b) => a.base_url.localeCompare(b.base_url));
  let leafletDomains = domains
    .filter((domain) => domain.type === "leaflet")
    .sort((a, b) => a.base_url.localeCompare(b.base_url));
  return (
    <div className="flex flex-col gap-2 px-3 pt-1 pb-3">
      <div>
        <div className="flex justify-between">
          <h4>Connected Domains</h4>
          <button
            className="text-accent-contrast rotate-180"
            onClick={() => {
              props.setState("default");
            }}
          >
            <GoToArrow />
          </button>
        </div>
      </div>
      <hr className="border-border-light -mx-3" />
      <div className="flex flex-col gap-2">
        <div className="font-bold -mb-1 text-secondary">Publications</div>
        {pubDomains.map((domain) => {
          return <Domain domain={domain} isPub />;
        })}
      </div>
      <hr className="border-border-light" />
      <div className="flex flex-col gap-2">
        <div className="font-bold -mb-2 text-secondary">Leaflets</div>
        {leafletDomains.map((domain) => {
          return <Domain key={domain.base_url} domain={domain} />;
        })}
      </div>
    </div>
  );
};

const Domain = (props: {
  isPub?: boolean;
  domain: {
    base_url: string;
    type: string;
    subdomains: {
      path: string;
      title: string;
    }[];
  };
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      {!props.isPub && (
        <div className="text-secondary font-bold text-sm ">
          {props.domain.base_url}
        </div>
      )}
      {props.domain.subdomains.map((subdomain) => {
        return (
          <SubDomain
            key={subdomain.path}
            path={subdomain.path}
            title={subdomain.title}
            isPub={props.isPub}
            base_url={props.domain.base_url}
          />
        );
      })}
    </div>
  );
};

const SubDomain = (props: {
  path: string;
  title: string;
  base_url: string;
  isPub?: boolean;
}) => {
  let toaster = useToaster();
  let [areYouSure, setAreYouSure] = useState(false);

  if (areYouSure) {
    return (
      <div className="opaque-container h-[28px] px-1 text-sm text-secondary flex gap-3 items-center font-bold">
        Unlink this domain?
        <div className="flex gap-1 items-center">
          <ButtonPrimary
            className="text-xs"
            compact
            onClick={() => {
              toaster({
                content: (
                  <div>
                    Unlinked {props.base_url}
                    {props.path}
                  </div>
                ),
                type: "success",
              });
            }}
          >
            Unlink
          </ButtonPrimary>
          <ButtonTertiary
            className="text-xs"
            onClick={() => setAreYouSure(false)}
          >
            Back
          </ButtonTertiary>
        </div>
      </div>
    );
  }
  return (
    <div className="opaque-container py-0.5 px-1 flex gap-1 items-center w-full h-[28px]">
      <div className=" grow flex gap-2 items-center w-full truncate">
        <Link className="text-sm flex-shrink-0" href="/" target="_blank">
          {props.isPub ? props.base_url : props.path}
        </Link>
        <div className="flex-1 text-sm text-tertiary text-right truncate min-w-16">
          {props.title}
        </div>
      </div>
      <Separator classname="py-0.5" />
      <button
        onClick={() => {
          setAreYouSure(true);
        }}
        className="shrink-0 ml-0.5"
      >
        <UnlinkTiny className="shrink-0" />
      </button>
    </div>
  );
};

const domains = [
  {
    base_url: "cozylittle.house",
    type: "leaflet",

    subdomains: [
      {
        path: "/recipes ",
        title: "Recipes! (WIP)",
      },
      {
        path: "/home-goods",
        title: "Home Goods to Learn From",
      },
      { path: "/baking", title: "My Baking Recipes" },
      { path: "/cafe", title: "Thoughts for the Cafe" },
    ],
  },
  {
    base_url: "theseare.my",
    type: "leaflet",
    subdomains: [
      {
        path: "/hobbies",
        title: "Hobbies!",
      },
    ],
  },
  {
    base_url: "cyberspaceline.online",
    type: "pub",
    subdomains: [{ path: "/", title: "Celine in Cyberspace" }],
  },
];
