"use client";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";

export function PublicationEditHeader(props: {
  did: string;
  publicationName: string;
}) {
  let dashboardHref = `/lish/${props.did}/${props.publicationName}/dashboard`;

  return (
    <div className="publicationEditHeader bg-accent-1 text-accent-2 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
      <SpeedyLink
        href={dashboardHref}
        className="flex items-center gap-1 text-accent-2 hover:no-underline! font-bold text-sm"
        aria-label="Back to dashboard"
      >
        <GoToArrowLined className="rotate-180" />
        Back to Dashboard
      </SpeedyLink>
      <button
        type="button"
        onClick={() => {
          // TODO: wire up Update Publication to publish/sync the publication record
        }}
        className="bg-accent-2 text-accent-1 font-bold px-3 py-1 rounded-md text-sm shrink-0"
      >
        Update Publication
      </button>
    </div>
  );
}
