"use client";

import { useState } from "react";
import { mutate } from "swr";
import { useDomainStatus } from "app/(app)/(identity)/(home-pages)/(writer)/settings/domains/useDomainStatus";

import {
  getDomainAssignment,
  describeAssignment,
} from "app/(app)/(identity)/(home-pages)/(writer)/settings/domains/domainAssignment";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import { ButtonPrimary } from "components/Buttons";
import {
  DomainVerificationModal,
  DomainVerificationDetailsModal,
} from "app/(app)/(identity)/(home-pages)/(writer)/settings/domains/DomainVerification";
import { Menu, MenuItem } from "components/Menu";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { SpeedyLink } from "components/SpeedyLink";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";
import { updatePublicationBasePath } from "actions/publications/updatePublication";
import {
  assignDomainToPublication,
  removeDomainAssignment,
} from "actions/domains";
import { PinTiny } from "components/Icons/PinTiny";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import type { CustomDomain } from "app/(app)/(identity)/(home-pages)/(writer)/settings/domains/DomainTab";
import { CheckTiny } from "components/Icons/CheckTiny";

export const PubDomainSettings = () => {
  let { data, mutate: mutatePubData } = usePublicationData();
  let { publication: pubData } = data || {};
  let record = useNormalizedPublicationRecord();
  let { identity, mutate: mutateIdentity } = useIdentityData();
  let toaster = useToaster();
  let basePath = record?.url?.replace(/^https?:\/\//, "") || "";

  let pubDomains = pubData?.publication_domains || [];
  let pubDomainNames = new Set(pubDomains.map((d) => d.domain));

  if (!pubData) return null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h4>Current Domains</h4>
        <div className="text-sm   mt-1">
          <div className="font-bold">DEFAULT</div>
          <div>
            We will use this domain when linking to your publication and its
            posts
          </div>
        </div>
        {pubDomains
          .filter((d) => d.domain === basePath)
          .map((d) => (
            <PubDomainRow
              key={d.domain}
              domain={d.domain}
              publication_uri={pubData.uri}
              basePath={basePath}
              mutatePubData={mutatePubData}
              mutateIdentity={mutateIdentity}
              toaster={toaster}
            />
          ))}
        {pubDomains.filter((d) => d.domain !== basePath).length !== 0 && (
          <>
            <div className="text-sm  mt-2">
              <div className="font-bold">ALTERNATES</div>
              <div>
                These all link to your publication and won't redirect to your
                default domain.
              </div>
            </div>
            {pubDomains
              .filter((d) => d.domain !== basePath)
              .map((d) => (
                <PubDomainRow
                  key={d.domain}
                  domain={d.domain}
                  publication_uri={pubData.uri}
                  basePath={basePath}
                  mutatePubData={mutatePubData}
                  mutateIdentity={mutateIdentity}
                  toaster={toaster}
                />
              ))}
          </>
        )}

        <hr className="my-2 border-border-light" />
        <h4>Available Domains</h4>
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
                  publication_uri={pubData.uri}
                  mutatePubData={mutatePubData}
                  onAssigned={() => {
                    mutateIdentity();
                    mutate("publication-data");
                  }}
                />
              ))}
              <div className="text-sm text-tertiary pt-0.5">
                Add new domains from your{" "}
                <SpeedyLink
                  href="/settings?tab=general"
                  className="text-accent-contrast"
                >
                  profile settings
                </SpeedyLink>
                !
              </div>
            </>
          ) : (
            <div className="text-sm text-tertiary">
              <strong>No available domains! </strong>
              Add new domains from your{" "}
              <SpeedyLink
                href="/settings?tab=general"
                className="text-accent-contrast"
              >
                profile settings
              </SpeedyLink>
              !
            </div>
          );
        })()}
      </div>
    </>
  );
};

function PubDomainRow(props: {
  domain: string;
  publication_uri: string;
  basePath: string;
  mutatePubData: ReturnType<typeof usePublicationData>["mutate"];
  mutateIdentity: ReturnType<typeof useIdentityData>["mutate"];
  toaster: ReturnType<typeof useToaster>;
}) {
  let { pending, ready } = useDomainStatus(props.domain);
  let [loading, setLoading] = useState(false);
  let [unlinking, setUnlinking] = useState(false);
  let [verificationOpen, setVerificationOpen] = useState(false);
  let toaster = props.toaster;

  async function unlink() {
    setUnlinking(true);
    props.mutatePubData(
      (current) => {
        if (!current) return current;
        let pub = current.publication;
        if (!pub) return current;
        return {
          ...current,
          publication: {
            ...pub,
            publication_domains: (pub.publication_domains || []).filter(
              (d) => d.domain !== props.domain,
            ),
          },
        };
      },
      { revalidate: false },
    );
    mutateIdentityData(props.mutateIdentity, (draft) => {
      let domain = draft.custom_domains.find((d) => d.domain === props.domain);
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
  }

  async function setAsDefault() {
    setLoading(true);
    props.mutatePubData(
      (current) => {
        if (!current) return current;
        let pub = current.publication;
        if (!pub?.record) return current;
        let rec = pub.record as Record<string, unknown>;
        if (typeof rec.url !== "string") return current;
        let protocol = rec.url.match(/^https?:\/\//)?.[0] || "https://";
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
    let result;
    try {
      result = await updatePublicationBasePath({
        uri: props.publication_uri,
        base_path: props.domain,
      });
    } catch {
      props.mutatePubData();
      setLoading(false);
      toaster({
        content: "We couldn't set your default domain. Please try again!",
        type: "error",
      });
      return;
    }
    props.mutatePubData();
    setLoading(false);

    if (!result.success) {
      toaster({
        content: isOAuthSessionError(result.error) ? (
          <OAuthErrorMessage error={result.error} />
        ) : (
          "We couldn't set your default domain. Please try again!"
        ),
        type: "error",
      });
      return;
    }

    toaster({
      content: (
        <div>
          Default domain set to <strong>{props.domain}</strong>
        </div>
      ),
      type: "success",
    });
  }

  let isDefault = props.basePath === props.domain;
  let isLeafletSubdomain = props.domain.endsWith(".leaflet.pub");

  return (
    <div className=" opaque-container text-secondary relative w-full flex items-center justify-between px-[6px] py-1 border rounded-md border-border-light">
      <span className="pr-8 truncate text-left">{props.domain}</span>
      <div className="flex justify-end items-center">
        {pending ? (
          <div className="px-1 py-0.5 flex gap-1 items-center">
            <p className="w-max pl-1 font-bold text-sm text-tertiary">
              pending
            </p>
            <LoadingTiny className="animate-spin text-accent-contrast" />
          </div>
        ) : loading || unlinking ? (
          <DotLoader className="h-[16px]! text-xs" />
        ) : (
          !(isDefault && isLeafletSubdomain) && (
            <Menu
              align="end"
              trigger={
                <div className="text-secondary hover:text-accent-contrast shrink-0">
                  <MoreOptionsVerticalTiny />
                </div>
              }
            >
              {!isDefault && ready && (
                <MenuItem className="items-center" onSelect={setAsDefault}>
                  <PinTiny />
                  Set as Default
                </MenuItem>
              )}
              {!isDefault && !isLeafletSubdomain && (
                <MenuItem className="items-center" onSelect={unlink}>
                  <UnlinkTiny />
                  Unlink from publication
                </MenuItem>
              )}
              {!isLeafletSubdomain && (
                <MenuItem
                  className="items-center"
                  onSelect={() => setVerificationOpen(true)}
                >
                  <CheckTiny /> See verification details
                </MenuItem>
              )}
            </Menu>
          )
        )}
      </div>
      <DomainVerificationDetailsModal
        domain={props.domain}
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
      />
    </div>
  );
}

function UnassignedDomainRow(props: {
  domainData: CustomDomain;
  publication_uri: string;
  mutatePubData: ReturnType<typeof usePublicationData>["mutate"];
  onAssigned: () => void;
}) {
  let { data, pending, ready } = useDomainStatus(props.domainData.domain);
  let { mutate: mutateIdentity } = useIdentityData();
  let assignment = getDomainAssignment(props.domainData);
  let [confirming, setConfirming] = useState(false);
  let [loading, setLoading] = useState(false);

  async function doAssign() {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }

  if (pending)
    return <DomainVerificationModal domain={props.domainData.domain} />;

  return (
    <div className="opaque-container text-tertiary w-full flex flex-col gap-1 px-[6px] py-1 border rounded-md border-border-light border-dashed">
      <div className="flex items-center justify-between">
        <span className="truncate text-left">{props.domainData.domain}</span>
        {confirming ? null : !data ? (
          <DotLoader className="h-[18px]! text-xs" />
        ) : !ready ? null : (
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
