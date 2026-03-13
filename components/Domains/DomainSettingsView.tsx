"use client";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { useDomainStatus } from "./useDomainStatus";
import { DotLoader } from "components/utils/DotLoader";
import { deleteDomain } from "actions/domains/deleteDomain";
import { removeDomainAssignment } from "actions/domains/removeDomainAssignment";
import { useIdentityData } from "components/IdentityProvider";

export function DomainSettingsView(props: {
  domain: string;
  onBack: () => void;
  onRemoveAssignment?: () => void;
  onDeleteDomain?: () => void;
}) {
  let { data, pending: needsSetup, mutate: mutateDomainStatus } = useDomainStatus(props.domain);
  let { mutate: mutateIdentity } = useIdentityData();
  let isSubdomain = props.domain.split(".").length > 2;

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
      ) : (
        <div className="text-green-600">This domain is verified!</div>
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
          {props.onRemoveAssignment && (
            <button
              className="text-accent-contrast text-sm"
              type="button"
              onMouseDown={async () => {
                await removeDomainAssignment({ domain: props.domain });
                mutateIdentity();
                props.onRemoveAssignment?.();
              }}
            >
              Remove Assignment
            </button>
          )}
          {props.onDeleteDomain && (
            <button
              className="text-accent-contrast font-bold text-sm"
              type="button"
              onMouseDown={async () => {
                await deleteDomain({ domain: props.domain });
                mutateIdentity();
                props.onDeleteDomain?.();
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
