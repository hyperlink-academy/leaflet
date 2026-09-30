"use client";
import { Fragment, useState, type ReactNode } from "react";
import { useDomainStatus } from "./useDomainStatus";
import { DotLoader } from "components/utils/DotLoader";
import { ButtonPrimary } from "components/Buttons";
import { Modal } from "components/Modal";
import { useSmoker } from "components/Toast";

// DomainVerification renders nothing once the domain verifies, so only give this a
// trigger while useDomainStatus reports the domain pending.
export function DomainVerificationModal(props: {
  domain: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="opaque-container text-tertiary w-full flex items-center gap-2 px-[6px] py-1 border rounded-md border-border-light border-dashed">
      <Modal
        asChild
        title="Verify this Domain"
        className="max-w-md"
        trigger={
          <button
            type="button"
            className="flex w-full justify-between items-center"
          >
            <span className="truncate text-left animate-pulse">
              {props.domain}
            </span>
            <span className="text-accent-contrast text-xs mr-1 font-bold shrink-0">
              Verify
            </span>
          </button>
        }
      >
        <DomainVerification domain={props.domain} />
      </Modal>
      {props.children}
    </div>
  );
}

export function DomainVerificationDetailsModal(props: {
  domain: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Verification Details"
      className="max-w-md"
    >
      <DomainVerification domain={props.domain} showWhenVerified />
    </Modal>
  );
}

export function DomainVerification(props: {
  domain: string;
  showWhenVerified?: boolean;
}) {
  let {
    data,
    pending,
    mutate: mutateDomainStatus,
  } = useDomainStatus(props.domain);

  let apex = data?.apexName ?? props.domain.split(".").slice(-2).join(".");
  let isSubdomain = props.domain !== apex;
  let relativeName = (name: string) =>
    name === apex
      ? "@"
      : name.endsWith(`.${apex}`)
        ? name.slice(0, -apex.length - 1)
        : name;

  if (!pending && !props.showWhenVerified) return null;
  if (!data) return <DotLoader />;

  let records: { type: string; name: string; value: string }[] = [];
  let pushVerification = (
    verification?: { type: string; domain: string; value: string }[],
  ) => {
    if (!verification) return;
    let record = {
      type: verification[0].type,
      name: relativeName(verification[0].domain),
      value: verification[0].value,
    };
    if (
      !records.some((r) => r.name === record.name && r.value === record.value)
    )
      records.push(record);
  };
  pushVerification(data?.verification);
  pushVerification(data?.www?.verification);
  if (data?.config)
    records.push(
      isSubdomain
        ? {
            type: "CNAME",
            name: relativeName(props.domain),
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
  if (data?.www?.config)
    records.push({
      type: "CNAME",
      name: relativeName(`www.${props.domain}`),
      value: data.www.config.recommendedCNAME.sort((a, b) => a.rank - b.rank)[0]
        .value,
    });

  return (
    <>
      {pending ? (
        <>
          <div className="pb-2">
            To verify this domain, add the following records to your DNS
            provider for <strong>{apex}</strong>.{" "}
          </div>
          <div className="pb-2">
            If this domain is already in use, be sure to remove the old records
            before adding these.
          </div>
          <div>
            Verification may take up to a few hours to process. If it has been
            longer, <a href="mailto:contact@leaflet.pub">contact us</a>.
          </div>
        </>
      ) : (
        <div>
          <strong>{props.domain}</strong> is verified. These are the records
          your DNS provider for <strong>{apex}</strong> should have.
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] border border-border-light rounded-md text-left my-4 text-sm">
        <div className="px-2 py-1 text-tertiary font-bold">Type</div>
        <div className="px-2 py-1 text-tertiary font-bold">Name</div>
        <div className="px-2 py-1 text-tertiary font-bold">Value</div>
        {records.map((record) => (
          <Fragment key={`${record.type}-${record.name}`}>
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
