"use client";
import { useState } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { publishPublicationPages } from "actions/publishPublicationPages";
import { useToaster } from "components/Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../../dashboard/PublicationSWRProvider";
import { DotLoader } from "components/utils/DotLoader";

type Status = "idle" | "publishing" | "success";

export function PublicationEditHeader(props: {
  did: string;
  publicationName: string;
}) {
  let { data, mutate } = usePublicationData();
  let publicationUri = data?.publication?.uri;
  let publicationUrl = useNormalizedPublicationRecord()?.url;
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
        mutate();
        setTimeout(() => setStatus("idle"), 2000);
        toaster({
          type: "success",
          content: (
            <span>
              Updated!{" "}
              {publicationUrl && (
                <a
                  href={publicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-white!"
                >
                  View here.
                </a>
              )}
            </span>
          ),
        });
      } else {
        setStatus("idle");
        toaster({
          type: "error",
          content: isOAuthSessionError(result.error) ? (
            <OAuthErrorMessage error={result.error} />
          ) : (
            result.error.message
          ),
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
    status === "publishing" ? (
      <DotLoader />
    ) : status === "success" ? (
      "Published!"
    ) : (
      "Update Publication"
    );

  return (
    <div className="publicationEditHeader bg-accent-1 text-accent-2 px-4 pt-4 pb-2 flex items-center justify-between gap-2 shrink-0">
      <SpeedyLink
        href={dashboardHref}
        className="flex flex-col text-accent-2 hover:no-underline! leading-none"
        aria-label="Back to dashboard "
      >
        <div className="flex items-center gap-1  font-bold text-sm">
          <GoToArrowLined className="rotate-180" />
          Back <span className="sm:block hidden">to Dashboard</span>
        </div>
        <div className="pl-5 text-xs">Draft autosaves</div>
      </SpeedyLink>
      <button
        type="button"
        onClick={handlePublish}
        className="bg-accent-2 text-accent-1 font-bold px-3 py-1 rounded-md text-sm shrink-0 disabled:opacity-60"
      >
        {label}
      </button>
    </div>
  );
}
