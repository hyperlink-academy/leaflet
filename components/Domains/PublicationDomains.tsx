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
import {
  assignDomainToPublication,
  removeDomainAssignment,
} from "actions/domains";
import { PubSettingsHeader } from "app/lish/[did]/[publication]/dashboard/settings/PublicationSettings";
import { AddDomainForm } from "./AddDomainForm";
import { DomainSettingsView } from "./DomainSettingsView";
import { PinTiny } from "components/Icons/PinTiny";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { AddTiny } from "components/Icons/AddTiny";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import type { CustomDomain } from "./DomainList";

export function PublicationDomains(props: {
  backToMenu: () => void;
  publication_uri: string;
}) {
  let { data, mutate: mutatePubData } = usePublicationData();
  let { publication: pubData } = data || {};
  let record = useNormalizedPublicationRecord();
  let { identity, mutate: mutateIdentity } = useIdentityData();
  let toaster = useToaster();
  let basePath = record?.url?.replace(/^https?:\/\//, "") || "";

  let pubDomains = pubData?.publication_domains || [];
  let pubDomainNames = new Set(pubDomains.map((d) => d.domain));

  return (
    <div>
      <PubSettingsHeader backToMenuAction={props.backToMenu}>
        Domains
      </PubSettingsHeader>
      <div className="flex flex-col gap-1 py-1">
        <h4 className="">This Publication's Domains</h4>
        <div className="text-xs text-tertiary -mb-1 ">DEFAULT</div>
        {pubDomains
          .filter((d) => d.domain === basePath)
          .map((d) => (
            <PubDomainRow
              key={d.domain}
              domain={d.domain}
              publication_uri={props.publication_uri}
              basePath={basePath}
              mutatePubData={mutatePubData}
              mutateIdentity={mutateIdentity}
              toaster={toaster}
              onSettings={() => {}}
            />
          ))}
        {pubDomains.filter((d) => d.domain !== basePath).length !== 0 && (
          <>
            <div className="text-xs text-tertiary pt-1">ALTERNATES</div>
            {pubDomains
              .filter((d) => d.domain !== basePath)
              .map((d) => (
                <PubDomainRow
                  key={d.domain}
                  domain={d.domain}
                  publication_uri={props.publication_uri}
                  basePath={basePath}
                  mutatePubData={mutatePubData}
                  mutateIdentity={mutateIdentity}
                  toaster={toaster}
                  onSettings={() => {}}
                />
              ))}
          </>
        )}

        <hr className="my-2 border-border-light" />
        <h4 className="">Available Domains</h4>
        {(() => {
          let availableDomains = (identity?.custom_domains || [])
            .filter((d) => !pubDomainNames.has(d.domain))
            .filter(
              (d) =>
                d.publication_domains.length === 0 &&
                d.custom_domain_routes.length === 0,
            );
          return availableDomains.length > 0 ? (
            <>
              {availableDomains.map((d) => (
                <UnassignedDomainRow
                  key={d.domain}
                  domainData={d}
                  publication_uri={props.publication_uri}
                  mutatePubData={mutatePubData}
                  onAssigned={() => {
                    mutateIdentity();
                    mutate("publication-data");
                  }}
                  onSettings={() => {}}
                />
              ))}
              <div className="text-sm text-tertiary pt-0.5">
                Add new domains from your profile settings!
              </div>
            </>
          ) : (
            <div className="text-sm text-tertiary">
              <strong>No available domains!</strong>
              <br />
              Add new domains from your profile settings!
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function PubDomainRow(props: {
  domain: string;
  publication_uri: string;
  basePath: string;
  mutatePubData: ReturnType<typeof usePublicationData>["mutate"];
  mutateIdentity: ReturnType<typeof useIdentityData>["mutate"];
  toaster: ReturnType<typeof useToaster>;
  onSettings: () => void;
}) {
  let { pending } = useDomainStatus(props.domain);
  let [loading, setLoading] = useState(false);
  let [unlinking, setUnlinking] = useState(false);
  let toaster = props.toaster;

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
        ) : (
          <>
            {props.basePath !== props.domain && (
              <div className="flex gap-1">
                {!props.domain.endsWith(".leaflet.pub") && (
                  <button
                    type="button"
                    disabled={unlinking}
                    className="text-tertiary hover:text-accent-contrast shrink-0"
                    onClick={async () => {
                      setUnlinking(true);
                      // Optimistically remove domain from publication data
                      props.mutatePubData(
                        (current) => {
                          if (!current) return current;
                          let pub = current.publication;
                          if (!pub) return current;
                          return {
                            ...current,
                            publication: {
                              ...pub,
                              publication_domains: (
                                pub.publication_domains || []
                              ).filter((d) => d.domain !== props.domain),
                            },
                          };
                        },
                        { revalidate: false },
                      );
                      // Optimistically remove publication assignment from identity data
                      mutateIdentityData(props.mutateIdentity, (draft) => {
                        let domain = draft.custom_domains.find(
                          (d) => d.domain === props.domain,
                        );
                        if (domain) {
                          domain.publication_domains = [];
                        }
                      });
                      toaster({
                        content: (
                          <div>
                            Unlinked <strong>{props.domain}</strong>
                          </div>
                        ),
                        type: "success",
                      });
                      await removeDomainAssignment({ domain: props.domain });
                      props.mutatePubData();
                      props.mutateIdentity();
                      setUnlinking(false);
                    }}
                  >
                    {unlinking ? (
                      <DotLoader className="h-[16px]! text-xs" />
                    ) : (
                      <UnlinkTiny />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    // Optimistically update the record's url so the UI
                    // immediately reflects the new default domain
                    props.mutatePubData(
                      (current) => {
                        if (!current) return current;
                        let pub = current.publication;
                        if (!pub?.record) return current;
                        let rec = pub.record as Record<string, unknown>;
                        if (typeof rec.url !== "string") return current;
                        let protocol =
                          rec.url.match(/^https?:\/\//)?.[0] || "https://";
                        return {
                          ...current,
                          publication: {
                            ...pub,
                            record: { ...rec, url: protocol + props.domain },
                          },
                        };
                      },
                      { revalidate: false },
                    );
                    toaster({
                      content: (
                        <div>
                          Default domain set to <strong>{props.domain}</strong>
                        </div>
                      ),
                      type: "success",
                    });
                    await updatePublicationBasePath({
                      uri: props.publication_uri,
                      base_path: props.domain,
                    });
                    props.mutatePubData();
                    setLoading(false);
                  }}
                  className="hover:text-accent-contrast"
                >
                  {loading ? (
                    <DotLoader className="h-[18px]! text-xs" />
                  ) : (
                    <PinTiny className="text-tertiary hover:text-accent-contrast group-hover/domain:text-accent-2 shrink-0" />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UnassignedDomainRow(props: {
  domainData: CustomDomain;
  publication_uri: string;
  mutatePubData: ReturnType<typeof usePublicationData>["mutate"];
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
        let pub = draft.publications?.find(
          (p) => p.uri === props.publication_uri,
        );
        domain.publication_domains = [
          {
            publication: props.publication_uri,
            domain: props.domainData.domain,
            identity: "",
            created_at: new Date().toISOString(),
            publications: pub ? { name: pub.name } : null,
          },
        ];
      }
    });
    props.mutatePubData(
      (current) => {
        if (!current) return current;
        let pub = current.publication;
        if (!pub) return current;
        return {
          ...current,
          publication: {
            ...pub,
            publication_domains: [
              ...(pub.publication_domains || []),
              {
                publication: props.publication_uri,
                domain: props.domainData.domain,
                created_at: new Date().toISOString(),
                identity: "",
              },
            ],
          },
        };
      },
      { revalidate: false },
    );
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
          <div className="text-tertiary animate-pulse  text-xs">unverfied</div>
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
            {loading ? <DotLoader className="h-[18px]! text-xs" /> : "assign"}
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
