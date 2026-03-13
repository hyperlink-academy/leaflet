"use client";
import { useIdentityData, Identity } from "components/IdentityProvider";
import { useDomainStatus } from "./useDomainStatus";
import { getDomainAssignment, describeAssignment } from "./domainAssignment";
import { AddTiny } from "components/Icons/AddTiny";

export type CustomDomain = NonNullable<Identity>["custom_domains"][number];

export function DomainList(props: {
  onSelectDomain: (domain: string) => void;
  onAddDomain: () => void;
  filter?: (domain: CustomDomain) => boolean;
}) {
  let { identity } = useIdentityData();
  let domains = identity?.custom_domains || [];
  if (props.filter) domains = domains.filter(props.filter);

  return (
    <div className="flex flex-col gap-1 text-secondary">
      {domains.map((domain) => (
        <DomainRow
          key={domain.domain}
          domain={domain}
          onSelect={() => props.onSelectDomain(domain.domain)}
        />
      ))}
      <button
        onMouseDown={() => props.onAddDomain()}
        className="text-accent-contrast flex gap-2 items-center px-1 py-0.5"
        type="button"
      >
        <AddTiny /> Add a New Domain
      </button>
    </div>
  );
}

function DomainRow(props: { domain: CustomDomain; onSelect: () => void }) {
  let { pending } = useDomainStatus(props.domain.domain);

  let assignment = getDomainAssignment(props.domain);
  let assignmentLabel = describeAssignment(assignment);

  return (
    <button
      type="button"
      className="px-[6px] py-1 flex border rounded-md border-border-light justify-between gap-2 items-center hover:border-accent-1 text-left w-full"
      onMouseDown={() => props.onSelect()}
    >
      <div className={`truncate ${pending ? "animate-pulse" : ""}`}>
        {props.domain.domain}
      </div>
      <div className="flex gap-2 items-center shrink-0">
        {assignmentLabel && (
          <span className="text-xs text-tertiary">{assignmentLabel}</span>
        )}
        {pending ? (
          <span className="text-accent-contrast text-sm">pending</span>
        ) : (
          <span className="text-sm text-green-600">verified</span>
        )}
      </div>
    </button>
  );
}
