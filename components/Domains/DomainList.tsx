"use client";
import { useIdentityData } from "components/IdentityProvider";
import { useDomainStatus } from "./useDomainStatus";
import { getDomainAssignment } from "./domainAssignment";
import { Identity } from "components/IdentityProvider";
import { GoToArrow } from "components/Icons/GoToArrow";

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
          <div className="font-bold text-secondary">Publications</div>
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
          <div className="font-bold  text-secondary">Leaflets</div>
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
            <hr className="border-border-light my-1" />
          )}
          <div className="flex flex-col gap-0.5">
            <div className="font-bold text-secondary">Unassigned</div>
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
  let assignment = getDomainAssignment(props.domain);

  return (
    <div className="flex flex-col gap-0.5">
      {props.showBase && (
        <button
          type="button"
          className="text-secondary font-normal! text-left flex gap-2 menuItem -mx-[8px] items-center py-0.5!"
          onClick={props.onSelect}
        >
          <div className="grow truncate min-w-0">{props.domain.domain}</div>
          <div className="text-sm text-tertiary font-normal shrink-0">
            {props.domain.custom_domain_routes.length} leaflet
            {props.domain.custom_domain_routes.length === 1 ? "" : "s"}
          </div>
          <GoToArrow className="shrink-0" />
        </button>
      )}
      {assignment.type === "publication" && (
        <SubDomainRow
          path="/"
          label={props.domain.domain}
          onSelect={props.onSelect}
        />
      )}
    </div>
  );
}

function SubDomainRow(props: {
  path: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="text-secondary font-normal! text-left flex gap-2 menuItem -mx-[8px] items-center py-0.5!"
      onClick={props.onSelect}
    >
      <div className="grow flex gap-2 items-center justify-between w-full truncate">
        <div className="grow truncate">{props.label}</div>
        <GoToArrow />
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
      className="py-0! flex  gap-2 font-normal! items-center text-left menuItem -mx-[8px]"
      onClick={props.onSelect}
    >
      <div className="grow truncate min-w-0">{props.domain.domain}</div>
      {pending && (
        <div className="text-sm text-tertiary animate-pulse">unverified</div>
      )}
      <GoToArrow />
    </button>
  );
}
