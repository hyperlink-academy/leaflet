"use client";
import { useState } from "react";
import { useDomainStatus } from "./useDomainStatus";
import { DotLoader } from "components/utils/DotLoader";
import { deleteDomain } from "actions/domains/deleteDomain";
import { removeDomainAssignment } from "actions/domains/removeDomainAssignment";
import { removeDomainRoute } from "actions/domains/removeDomainRoute";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { getDomainAssignment } from "./domainAssignment";
import { RefreshSmall } from "components/Icons/RefreshSmall";
import { GoToArrow } from "components/Icons/GoToArrow";

export function DomainSettingsView(props: {
  domain: string;
  onBack: () => void;
  onRemoveAssignment?: () => void;
  onDeleteDomain?: () => void;
}) {
  let {
    data,
    pending: needsSetup,
    mutate: mutateDomainStatus,
  } = useDomainStatus(props.domain);
  let { identity, mutate: mutateIdentity } = useIdentityData();
  let isSubdomain = props.domain.split(".").length > 2;

  let domainData = identity?.custom_domains.find(
    (d) => d.domain === props.domain,
  );
  let assignment = domainData ? getDomainAssignment(domainData) : null;
  let isAssigned = assignment && assignment.type !== "unassigned";

  return (
    <div className="flex flex-col gap-[6px] text-sm text-primary max-w-full">
      <div className="w-full flex gap-2 items-center">
        <h3 className="w-full grow min-w-0 truncate">
          {needsSetup ? `Verify ${props.domain}` : props.domain}
        </h3>
        <button
          className="text-accent-contrast rotate-180 shrink-0"
          onMouseDown={() => props.onBack()}
          type="button"
        >
          <GoToArrow />
        </button>
        {needsSetup && <VerifyButton verify={() => mutateDomainStatus()} />}
      </div>

      {needsSetup ? (
        <>
          <div>
            To verify this domain, add the following record to your DNS provider
            for <strong>{props.domain}</strong>.
          </div>
          <table className="border border-border-light rounded-md text-left ">
            <thead>
              <tr>
                <th className="px-2 pt-1 text-tertiary">Type</th>
                <th className="px-2 pt-1  text-tertiary">Name</th>
                <th className="px-2 pt-1 text-tertiary">Value</th>
              </tr>
            </thead>
            <tbody>
              {data?.verification && (
                <tr>
                  <td className="px-2 pb-1">
                    <div>{data.verification[0].type}</div>
                  </td>
                  <td className="px-2  pb-1">
                    <div style={{ wordBreak: "break-word" }}>
                      {data.verification[0].domain}
                    </div>
                  </td>
                  <td className="px-2 pb-1">
                    <div style={{ wordBreak: "break-word" }}>
                      {data.verification[0].value}
                    </div>
                  </td>
                </tr>
              )}
              {data?.config &&
                (isSubdomain ? (
                  <tr>
                    <td className="px-2 pb-1">
                      <div>CNAME</div>
                    </td>
                    <td className="px-2 pb-1">
                      <div style={{ wordBreak: "break-word" }}>
                        {props.domain.split(".").slice(0, -2).join(".")}
                      </div>
                    </td>
                    <td className="px-2 pb-1">
                      <div style={{ wordBreak: "break-word" }}>
                        {
                          data.config.recommendedCNAME.sort(
                            (a, b) => a.rank - b.rank,
                          )[0].value
                        }
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td className="px-2 pb-1">
                      <div>A</div>
                    </td>
                    <td className="px-2 pb-1">
                      <div style={{ wordBreak: "break-word" }}>@</div>
                    </td>
                    <td className="px-2 pb-1">
                      <div style={{ wordBreak: "break-word" }}>
                        {
                          data.config.recommendedIPv4.sort(
                            (a, b) => a.rank - b.rank,
                          )[0].value[0]
                        }
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      ) : null}

      {/* Assignment list */}
      {props.onRemoveAssignment && isAssigned && domainData && (
        <div className="flex flex-col gap-1 mt-1">
          <h4 className="text-tertiary text-xs">Assigned to</h4>
          {domainData.publication_domains.length > 0 && (
            <div className="flex items-center justify-between px-[6px] py-1 border rounded-md border-border-light">
              <span className="text-secondary">publication</span>
              <button
                className="text-accent-contrast text-xs"
                type="button"
                onMouseDown={async () => {
                  mutateIdentityData(mutateIdentity, (draft) => {
                    let domain = draft.custom_domains.find(
                      (d) => d.domain === props.domain,
                    );
                    if (domain) {
                      domain.publication_domains = [];
                    }
                  });
                  props.onRemoveAssignment?.();
                  await removeDomainAssignment({ domain: props.domain });
                }}
              >
                remove
              </button>
            </div>
          )}
          {domainData.custom_domain_routes.map((route) => (
            <div
              key={route.id}
              className="flex items-center justify-between px-[6px] py-1 border rounded-md border-border-light"
            >
              <a
                href={`/${route.edit_permission_token}`}
                className="text-accent-contrast hover:underline truncate"
              >
                {route.route}
              </a>
              <button
                className="text-accent-contrast text-xs shrink-0 ml-2"
                type="button"
                onMouseDown={async () => {
                  mutateIdentityData(mutateIdentity, (draft) => {
                    let domain = draft.custom_domains.find(
                      (d) => d.domain === props.domain,
                    );
                    if (domain) {
                      domain.custom_domain_routes =
                        domain.custom_domain_routes.filter(
                          (r) => r.id !== route.id,
                        );
                    }
                  });
                  // If this was the last route, go back to the list
                  if (domainData.custom_domain_routes.length <= 1) {
                    props.onRemoveAssignment?.();
                  }
                  await removeDomainRoute({ routeId: route.id });
                }}
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-2">
        <hr className="border-border-light" />

        <DeleteDomainButton
          domain={props.domain}
          onDeleteDomain={props.onDeleteDomain}
          mutateIdentity={mutateIdentity}
        />
      </div>
    </div>
  );
}

function DeleteDomainButton(props: {
  domain: string;
  onDeleteDomain?: () => void;
  mutateIdentity: ReturnType<typeof useIdentityData>["mutate"];
}) {
  let [confirming, setConfirming] = useState(false);
  let [loading, setLoading] = useState(false);

  if (!props.onDeleteDomain) return null;

  if (!confirming) {
    return (
      <ButtonTertiary
        fullWidth
        compact
        type="button"
        onMouseDown={() => setConfirming(true)}
      >
        Delete Domain
      </ButtonTertiary>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-sm accent-container rounded-md p-2">
      <p className="text-secondary text-center">
        Are you sure you want to delete <strong>{props.domain}</strong>? This
        will remove all assignments and cannot be undone.
      </p>
      <div className="flex gap-2 justify-center">
        <button
          className="text-accent-contrast font-bold"
          onMouseDown={() => setConfirming(false)}
          type="button"
        >
          Cancel
        </button>
        <ButtonPrimary
          compact
          className="text-sm"
          disabled={loading}
          onMouseDown={async () => {
            setLoading(true);
            mutateIdentityData(props.mutateIdentity, (draft) => {
              draft.custom_domains = draft.custom_domains.filter(
                (d) => d.domain !== props.domain,
              );
            });
            props.onDeleteDomain?.();
            await deleteDomain({ domain: props.domain });
          }}
        >
          {loading ? <DotLoader /> : "Delete"}
        </ButtonPrimary>
      </div>
    </div>
  );
}

function VerifyButton(props: { verify: () => Promise<any> }) {
  let [loading, setLoading] = useState(false);
  return (
    <ButtonPrimary
      compact
      className="w-[118px]!"
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        setLoading(true);
        await props.verify();
        setLoading(false);
      }}
    >
      {loading ? <DotLoader /> : "Check Status"}
    </ButtonPrimary>
  );
}
