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
import { getDomainAssignment } from "./domainAssignment";

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
      <h3 className="text-secondary">{props.domain}</h3>

      {needsSetup ? (
        <>
          <div>
            To verify this domain, add the following record to your DNS provider
            for <strong>{props.domain}</strong>.
          </div>
          <table className="border border-border-light rounded-md">
            <thead>
              <tr>
                <th className="p-1 py-1 text-tertiary">Type</th>
                <th className="p-1 py-1 text-tertiary">Name</th>
                <th className="p-1 py-1 text-tertiary">Value</th>
              </tr>
            </thead>
            <tbody>
              {data?.verification && (
                <tr>
                  <td className="p-1 py-1">
                    <div>{data.verification[0].type}</div>
                  </td>
                  <td className="p-1 py-1">
                    <div style={{ wordBreak: "break-word" }}>
                      {data.verification[0].domain}
                    </div>
                  </td>
                  <td className="p-1 py-1">
                    <div style={{ wordBreak: "break-word" }}>
                      {data.verification[0].value}
                    </div>
                  </td>
                </tr>
              )}
              {data?.config &&
                (isSubdomain ? (
                  <tr>
                    <td className="p-1 py-1">
                      <div>CNAME</div>
                    </td>
                    <td className="p-1 py-1">
                      <div style={{ wordBreak: "break-word" }}>
                        {props.domain.split(".").slice(0, -2).join(".")}
                      </div>
                    </td>
                    <td className="p-1 py-1">
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
                    <td className="p-1 py-1">
                      <div>A</div>
                    </td>
                    <td className="p-1 py-1">
                      <div style={{ wordBreak: "break-word" }}>@</div>
                    </td>
                    <td className="p-1 py-1">
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
        <div className="flex gap-3 justify-between items-center">
          <button
            className="text-accent-contrast"
            onMouseDown={() => props.onBack()}
            type="button"
          >
            Back
          </button>
          <div className="flex gap-2 items-center">
            {needsSetup && (
              <VerifyButton verify={() => mutateDomainStatus()} />
            )}
          </div>
        </div>

        <hr className="border-border-light" />

        <div className="flex gap-3 justify-between items-center">
          {props.onDeleteDomain && (
            <button
              className="text-accent-contrast font-bold text-sm"
              type="button"
              onMouseDown={async () => {
                mutateIdentityData(mutateIdentity, (draft) => {
                  draft.custom_domains = draft.custom_domains.filter(
                    (d) => d.domain !== props.domain,
                  );
                });
                props.onDeleteDomain?.();
                await deleteDomain({ domain: props.domain });
              }}
            >
              Delete Domain
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifyButton(props: { verify: () => Promise<any> }) {
  let [loading, setLoading] = useState(false);
  return (
    <button
      className="text-accent-contrast w-fit"
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        setLoading(true);
        await props.verify();
        setLoading(false);
      }}
    >
      {loading ? <DotLoader /> : "verify"}
    </button>
  );
}
