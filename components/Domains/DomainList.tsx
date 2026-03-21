"use client";
import { useState } from "react";
import { useIdentityData } from "components/IdentityProvider";
import { useDomainStatus } from "./useDomainStatus";
import { getDomainAssignment } from "./domainAssignment";
import { AddTiny } from "components/Icons/AddTiny";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { Separator } from "components/Layout";
import { Identity } from "components/IdentityProvider";

export type CustomDomain = NonNullable<Identity>["custom_domains"][number];

export function DomainList(props: {
  onSelectDomain: (domain: string) => void;
  filter?: (domain: CustomDomain) => boolean;
}) {
  let { identity } = useIdentityData();
  let domains = identity?.custom_domains || [];
  if (props.filter) domains = domains.filter(props.filter);

  let pubDomains = domains.filter(
    (d) => getDomainAssignment(d).type === "publication",
  );
  let leafletDomains = domains.filter(
    (d) => getDomainAssignment(d).type === "document",
  );
  let unassignedDomains = domains.filter(
    (d) => getDomainAssignment(d).type === "unassigned",
  );

  return (
    <div className="flex flex-col gap-2 text-secondary">
      {pubDomains.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="font-bold -mb-1 text-secondary">Publications</div>
          {pubDomains.map((domain) => (
            <DomainGroup
              key={domain.domain}
              domain={domain}
              onSelect={() => props.onSelectDomain(domain.domain)}
              showBase={false}
            />
          ))}
        </div>
      )}
      {pubDomains.length > 0 && leafletDomains.length > 0 && (
        <hr className="border-border-light" />
      )}
      {leafletDomains.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="font-bold -mb-1 text-secondary">Leaflets</div>
          {leafletDomains.map((domain) => (
            <DomainGroup
              key={domain.domain}
              domain={domain}
              onSelect={() => props.onSelectDomain(domain.domain)}
              showBase
            />
          ))}
        </div>
      )}
      {unassignedDomains.length > 0 && (
        <>
          {(pubDomains.length > 0 || leafletDomains.length > 0) && (
            <hr className="border-border-light" />
          )}
          <div className="flex flex-col gap-0.5">
            <div className="font-bold -mb-1 text-secondary">Unassigned</div>
            {unassignedDomains.map((domain) => (
              <UnassignedDomainRow
                key={domain.domain}
                domain={domain}
                onSelect={() => props.onSelectDomain(domain.domain)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DomainGroup(props: {
  domain: CustomDomain;
  onSelect: () => void;
  showBase: boolean;
}) {
  let { pending } = useDomainStatus(props.domain.domain);
  let assignment = getDomainAssignment(props.domain);

  return (
    <div className="flex flex-col gap-0.5">
      {props.showBase && (
        <button
          type="button"
          className="text-secondary font-bold text-sm text-left"
          onClick={props.onSelect}
        >
          {props.domain.domain}
          {pending && (
            <span className="text-accent-contrast text-xs ml-2 font-normal">
              unverified
            </span>
          )}
        </button>
      )}
      {assignment.type === "publication" && (
        <SubDomainRow
          path="/"
          label={props.domain.domain}
          onSelect={props.onSelect}
          isPub
        />
      )}
      {props.domain.custom_domain_routes.map((route) => (
        <SubDomainRow
          key={route.id}
          path={route.route}
          label={route.route}
          onSelect={props.onSelect}
        />
      ))}
    </div>
  );
}

function SubDomainRow(props: {
  path: string;
  label: string;
  onSelect: () => void;
  isPub?: boolean;
}) {
  return (
    <button
      type="button"
      className="opaque-container py-0.5 px-1 flex gap-1 items-center w-full h-[28px] text-left"
      onClick={props.onSelect}
    >
      <div className="grow flex gap-2 items-center w-full truncate">
        <span className="text-sm flex-shrink-0">
          {props.isPub ? props.label : props.path}
        </span>
      </div>
    </button>
  );
}

function UnassignedDomainRow(props: {
  domain: CustomDomain;
  onSelect: () => void;
}) {
  let { pending } = useDomainStatus(props.domain.domain);

  return (
    <button
      type="button"
      className="px-1 py-0.5 flex justify-between gap-2 items-center text-left w-full text-sm"
      onClick={props.onSelect}
    >
      <span className={pending ? "animate-pulse" : ""}>
        {props.domain.domain}
      </span>
      {pending && (
        <span className="text-accent-contrast text-xs">unverified</span>
      )}
    </button>
  );
}
