"use client";
import { useState } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { publishPublicationPages } from "actions/publishPublicationPages";
import { useToaster } from "components/Toast";
import { usePublicationData } from "../../dashboard/PublicationSWRProvider";

type Status = "idle" | "publishing" | "success";

export function PublicationEditHeader(props: {
  did: string;
  publicationName: string;
}) {
  let { data } = usePublicationData();
  let publicationUri = data?.publication?.uri;
  let [status, setStatus] = useState<Status>("idle");
  let toaster = useToaster();

  let dashboardHref = `/lish/${props.did}/${props.publicationName}/dashboard`;

  async function handlePublish() {
    if (!publicationUri || status === "publishing") return;
    setStatus("publishing");
    try {
      const result = await publishPublicationPages({
        publication_uri: publicationUri,
      });
      if (result.success) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("idle");
        toaster({
          type: "error",
          content:
            result.error.type === "oauth_session_expired"
              ? "Sign in again to publish"
              : result.error.message,
        });
      }
    } catch (e) {
      setStatus("idle");
      toaster({
        type: "error",
        content: e instanceof Error ? e.message : "Failed to publish",
      });
    }
  }

  let label =
    status === "publishing"
      ? "Publishing..."
      : status === "success"
        ? "Published!"
        : "Update Publication";

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
        onClick={handlePublish}
        disabled={status === "publishing" || !publicationUri}
        className="bg-accent-2 text-accent-1 font-bold px-3 py-1 rounded-md text-sm shrink-0 disabled:opacity-60"
      >
        {label}
      </button>
    </div>
  );
}
