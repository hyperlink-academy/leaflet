"use client";
import { Fragment, useState } from "react";
import { useDomainStatus } from "./useDomainStatus";
import { DotLoader } from "components/utils/DotLoader";
import { ButtonPrimary } from "components/Buttons";
import { useSmoker } from "components/Toast";

export function DomainVerification(props: { domain: string }) {
  let {
    data,
    pending,
    mutate: mutateDomainStatus,
  } = useDomainStatus(props.domain);
  let isSubdomain = props.domain.split(".").length > 2;

  if (!pending) return null;

  let records: { type: string; name: string; value: string }[] = [];
  if (data?.verification)
    records.push({
      type: data.verification[0].type,
      name: data.verification[0].domain,
      value: data.verification[0].value,
    });
  if (data?.config)
    records.push(
      isSubdomain
        ? {
            type: "CNAME",
            name: props.domain.split(".").slice(0, -2).join("."),
            value: data.config.recommendedCNAME.sort(
              (a, b) => a.rank - b.rank,
            )[0].value,
          }
        : {
            type: "A",
            name: "@",
            value: data.config.recommendedIPv4.sort(
              (a, b) => a.rank - b.rank,
            )[0].value[0],
          },
    );

  return (
    <>
      <div>
        To verify this domain, add the following record to your DNS provider for{" "}
        <strong>{props.domain}</strong>.
      </div>
      <div>Verfication may take up to a few hours to process.</div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] border border-border-light rounded-md text-left my-2 text-sm">
        <div className="px-2 py-1 text-tertiary font-bold">Type</div>
        <div className="px-2 py-1 text-tertiary font-bold">Name</div>
        <div className="px-2 py-1 text-tertiary font-bold">Value</div>
        {records.map((record) => (
          <Fragment key={record.type}>
            <CopyCell value={record.type} />
            <CopyCell value={record.name} />
            <CopyCell value={record.value} />
          </Fragment>
        ))}
      </div>
      <VerifyButton verify={() => mutateDomainStatus()} />
    </>
  );
}

function CopyCell(props: { value: string }) {
  let smoker = useSmoker();
  return (
    <button
      type="button"
      className="px-2 py-1 text-left text-secondary hover:text-accent-contrast self-start border-t border-border-light"
      style={{ wordBreak: "break-word" }}
      onClick={(e) => {
        navigator.clipboard.writeText(props.value);
        smoker({
          text: <strong>Copied!</strong>,
          position: { x: e.clientX, y: e.clientY - 5 },
        });
      }}
    >
      {props.value}
    </button>
  );
}

function VerifyButton(props: { verify: () => Promise<any> }) {
  let [loading, setLoading] = useState(false);
  let smoker = useSmoker();
  return (
    <ButtonPrimary
      fullWidth
      className="mt-2"
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        setLoading(true);
        let result = await props.verify();
        setLoading(false);
        let stillPending =
          result?.config?.misconfigured || result?.verification;
        if (stillPending) {
          smoker({
            position: {
              x: e.clientX,
              y: e.clientY - 5,
            },
            text: "Still processing",
          });
        }
      }}
    >
      {loading ? <DotLoader /> : "Check Status"}
    </ButtonPrimary>
  );
}
