"use client";
import { useState } from "react";
import { mutate } from "swr";
import { useDomainStatus } from "./useDomainStatus";
import { getDomainAssignment, describeAssignment } from "./domainAssignment";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import { ButtonPrimary } from "components/Buttons";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { updatePublicationBasePath } from "app/lish/createPub/updatePublication";
import { assignDomainToPublication } from "actions/domains/assignDomainToPublication";
import { PubSettingsHeader } from "app/lish/[did]/[publication]/dashboard/settings/PublicationSettings";
import { AddDomainForm } from "./AddDomainForm";
import { DomainSettingsView } from "./DomainSettingsView";
import { PinTiny } from "components/Icons/PinTiny";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { AddTiny } from "components/Icons/AddTiny";
import { DotLoader } from "components/utils/DotLoader";
import type { CustomDomain } from "./DomainList";

type State =
  | "list"
  | "add-domain"
  | { type: "domain-settings"; domain: string };

export function PublicationDomains(props: {
  backToMenu: () => void;
  publication_uri: string;
}) {
  let [state, setState] = useState<State>("list");
  let [loading, setLoading] = useState(false);
  let { data } = usePublicationData();
  let { publication: pubData } = data || {};
  let record = useNormalizedPublicationRecord();
  let { identity, mutate: mutateIdentity } = useIdentityData();
  let basePath = record?.url?.replace(/^https?:\/\//, "") || "";

  if (state === "add-domain") {
    return (
      <div>
        <PubSettingsHeader backToMenuAction={() => setState("list")}>
          Add Domain
        </PubSettingsHeader>
        <AddDomainForm
          onDomainAdded={async (domain) => {
            await assignDomainToPublication({
              domain,
              publication_uri: props.publication_uri,
            });
            mutateIdentity();
            mutate("publication-data");
            setState({ type: "domain-settings", domain });
          }}
          onBack={() => setState("list")}
        />
      </div>
    );
  }

  if (typeof state === "object" && state.type === "domain-settings") {
    return (
      <div>
        <PubSettingsHeader backToMenuAction={() => setState("list")}>
          Domain Settings
        </PubSettingsHeader>
        <DomainSettingsView
          domain={state.domain}
          onBack={() => setState("list")}
          onRemoveAssignment={() => {
            mutate("publication-data");
            setState("list");
          }}
          onDeleteDomain={() => {
            mutate("publication-data");
            setState("list");
          }}
        />
      </div>
    );
  }

  let pubDomains = pubData?.publication_domains || [];
  let pubDomainNames = new Set(pubDomains.map((d) => d.domain));

  return (
    <div>
      <PubSettingsHeader backToMenuAction={props.backToMenu}>
        Domains
      </PubSettingsHeader>
      <div className="flex flex-col gap-1 py-1">
        {pubDomains.map((d) => (
          <PubDomainRow
            key={d.domain}
            domain={d.domain}
            publication_uri={props.publication_uri}
            basePath={basePath}
            onSettings={() =>
              setState({ type: "domain-settings", domain: d.domain })
            }
          />
        ))}
        {(identity?.custom_domains || [])
          .filter((d) => !pubDomainNames.has(d.domain))
          .map((d) => (
            <UnassignedDomainRow
              key={d.domain}
              domainData={d}
              publication_uri={props.publication_uri}
              onAssigned={() => {
                mutateIdentity();
                mutate("publication-data");
              }}
              onSettings={() =>
                setState({ type: "domain-settings", domain: d.domain })
              }
            />
          ))}
        <button
          className="text-accent-contrast text-sm w-fit flex gap-2 items-center px-1 py-0.5"
          onClick={() => setState("add-domain")}
          type="button"
        >
          <AddTiny /> Add custom domain
        </button>
      </div>
    </div>
  );
}

function PubDomainRow(props: {
  domain: string;
  publication_uri: string;
  basePath: string;
  onSettings: () => void;
}) {
  let { pending } = useDomainStatus(props.domain);
  let [loading, setLoading] = useState(false);

  return (
    <div className="text-sm text-secondary relative w-full flex items-center justify-between px-[6px] py-1 border rounded-md border-border-light">
      <button
        type="button"
        className="pr-8 truncate text-left"
        onMouseDown={() => props.onSettings()}
      >
        {props.domain}
      </button>
      <div className="flex justify-end items-center">
        {pending ? (
          <button
            className="group/pending px-1 py-0.5 flex gap-1 items-center rounded-full hover:bg-accent-1 hover:text-accent-2 hover:outline-accent-1 border-transparent outline-solid outline-transparent selected-outline"
            onClick={() => props.onSettings()}
            type="button"
          >
            <p className="group-hover/pending:block hidden w-max pl-1 font-bold">
              pending
            </p>
            <LoadingTiny className="animate-spin text-accent-contrast group-hover/pending:text-accent-2" />
          </button>
        ) : props.basePath === props.domain ? (
          <div className="group/default-domain flex gap-1 items-center rounded-full bg-none w-max px-1 py-0.5 hover:bg-bg-page border border-transparent hover:border-border-light">
            <p className="group-hover/default-domain:block hidden w-max pl-1">
              current default domain
            </p>
            <PinTiny className="text-accent-contrast shrink-0" />
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await updatePublicationBasePath({
                uri: props.publication_uri,
                base_path: props.domain,
              });
              mutate("publication-data");
              setLoading(false);
            }}
            className="group/domain flex gap-1 items-center rounded-full bg-none w-max font-bold px-1 py-0.5 hover:bg-accent-1 hover:text-accent-2 border-transparent outline-solid outline-transparent hover:outline-accent-1 selected-outline"
          >
            {loading ? (
              <DotLoader />
            ) : (
              <>
                <p className="group-hover/domain:block hidden w-max pl-1">
                  set as default
                </p>
                <PinTiny className="text-secondary group-hover/domain:text-accent-2 shrink-0" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function UnassignedDomainRow(props: {
  domainData: CustomDomain;
  publication_uri: string;
  onAssigned: () => void;
  onSettings: () => void;
}) {
  let { pending } = useDomainStatus(props.domainData.domain);
  let { mutate: mutateIdentity } = useIdentityData();
  let assignment = getDomainAssignment(props.domainData);
  let [confirming, setConfirming] = useState(false);
  let [loading, setLoading] = useState(false);

  async function doAssign() {
    setLoading(true);
    mutateIdentityData(mutateIdentity, (draft) => {
      let domain = draft.custom_domains.find(
        (d) => d.domain === props.domainData.domain,
      );
      if (domain) {
        domain.custom_domain_routes = [];
        domain.publication_domains = [
          {
            publication: props.publication_uri,
            domain: props.domainData.domain,
            identity: "",
            created_at: new Date().toISOString(),
          },
        ];
      }
    });
    setConfirming(false);
    props.onAssigned();
    await assignDomainToPublication({
      domain: props.domainData.domain,
      publication_uri: props.publication_uri,
    });
  }

  return (
    <div className="text-sm text-tertiary w-full flex flex-col gap-1 px-[6px] py-1 border rounded-md border-border-light border-dashed">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="truncate text-left"
          onMouseDown={() => props.onSettings()}
        >
          {props.domainData.domain}
        </button>
        {pending ? (
          <button
            className="text-accent-contrast text-xs"
            onClick={() => props.onSettings()}
            type="button"
          >
            pending
          </button>
        ) : confirming ? null : (
          <button
            className="text-accent-contrast text-xs font-bold"
            type="button"
            disabled={loading}
            onClick={() => {
              if (assignment.type === "document") {
                setConfirming(true);
              } else {
                doAssign();
              }
            }}
          >
            {loading ? <DotLoader /> : "assign"}
          </button>
        )}
      </div>
      {confirming && (
        <div className="text-xs border-t border-border-light pt-1 flex flex-col gap-1">
          <p className="text-secondary">
            This domain is currently assigned to{" "}
            {describeAssignment(assignment)}. Assigning it here will remove that
            assignment.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              className="text-accent-contrast"
              onMouseDown={() => setConfirming(false)}
              type="button"
            >
              Cancel
            </button>
            <ButtonPrimary compact disabled={loading} onMouseDown={doAssign}>
              {loading ? <DotLoader /> : "Reassign"}
            </ButtonPrimary>
          </div>
        </div>
      )}
    </div>
  );
}
