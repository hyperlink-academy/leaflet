"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import {
  reviewPublication,
  clearPublicationReview,
  reviewQueuedPublications,
} from "actions/admin/publicationReview";

type PublicationSummary = {
  uri: string;
  name: string;
  url: string;
  description: string | null;
  did: string;
  handle: string | null;
  createdAt: string;
};

export type QueuedPublication = PublicationSummary & {
  postCount: number;
  recentPostTitles: string[];
  verdict: string | null;
  verdictCategory: string | null;
  verdictReason: string | null;
};

export type SpamPublication = PublicationSummary & {
  flaggedAt: string;
  automated: boolean;
  verdictReason: string | null;
};

export type ClearedPublication = PublicationSummary & {
  clearedAt: string;
  verdictReason: string | null;
};

export function AdminPublicationQueue(props: {
  queue: QueuedPublication[];
  queueFull: boolean;
  spam: SpamPublication[];
  cleared: ClearedPublication[];
}) {
  let toaster = useToaster();
  let router = useRouter();
  let [busy, setBusy] = useState<string | null>(null);
  // Rows leave the list as soon as their action lands, ahead of the refresh.
  let [handled, setHandled] = useState<Set<string>>(new Set());

  let run = async (
    uri: string,
    action: () => ReturnType<typeof reviewPublication>,
  ) => {
    if (busy) return;
    setBusy(uri);
    let res = await action();
    setBusy(null);
    if (!res.ok) {
      toaster({ type: "error", content: res.error });
      return;
    }
    setHandled((h) => new Set(h).add(uri));
    router.refresh();
  };

  let [requesting, setRequesting] = useState(false);
  let requestReviews = async () => {
    setRequesting(true);
    let res = await reviewQueuedPublications();
    setRequesting(false);
    toaster(
      res.ok
        ? {
            type: "success",
            content: `Automated review requested for ${res.value} publications`,
          }
        : { type: "error", content: res.error },
    );
  };

  let queue = props.queue.filter((p) => !handled.has(p.uri));
  let spam = props.spam.filter((p) => !handled.has(p.uri));
  let cleared = props.cleared.filter((p) => !handled.has(p.uri));

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h2>Publication review queue</h2>
        <div className="text-secondary leading-snug">
          New publications created on Leaflet, newest first. A publication stays
          out of the discovery feeds until it is marked reviewed, and for good
          once flagged as spam.
        </div>
        {queue.some((p) => !p.verdict) && (
          <ButtonSecondary
            compact
            className="self-start mt-1"
            disabled={requesting}
            onClick={requestReviews}
          >
            {requesting ? <DotLoader /> : "Run automated review on the queue"}
          </ButtonSecondary>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3>
          To review ({queue.length}
          {props.queueFull && "+"})
        </h3>
        {queue.length === 0 ? (
          <div className="text-tertiary text-sm">Nothing to review.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((pub) => (
              <div
                key={pub.uri}
                className="flex flex-col gap-2 border border-border-light rounded-md px-3 py-2"
              >
                <PublicationDetails publication={pub}>
                  <div className="text-xs text-tertiary">
                    {pub.postCount} post{pub.postCount === 1 ? "" : "s"}
                    {pub.recentPostTitles.length > 0 &&
                      `: ${pub.recentPostTitles.join(" · ")}`}
                  </div>
                  {pub.verdict && (
                    <div className="text-xs text-secondary">
                      <span className="font-bold">
                        Automated review: {pub.verdict}
                        {pub.verdictCategory &&
                          pub.verdictCategory !== "none" &&
                          ` (${pub.verdictCategory.replaceAll("_", " ")})`}
                      </span>{" "}
                      {pub.verdictReason}
                    </div>
                  )}
                </PublicationDetails>
                <div className="flex gap-2 justify-end">
                  <ButtonSecondary
                    compact
                    disabled={busy === pub.uri}
                    onClick={() =>
                      run(pub.uri, () =>
                        reviewPublication({ uri: pub.uri, spam: true }),
                      )
                    }
                  >
                    Flag as spam
                  </ButtonSecondary>
                  <ButtonPrimary
                    compact
                    disabled={busy === pub.uri}
                    onClick={() =>
                      run(pub.uri, () =>
                        reviewPublication({ uri: pub.uri, spam: false }),
                      )
                    }
                  >
                    {busy === pub.uri ? <DotLoader /> : "Mark reviewed"}
                  </ButtonPrimary>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3>Flagged as spam ({spam.length})</h3>
        {spam.length === 0 ? (
          <div className="text-tertiary text-sm">Nothing flagged.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {spam.map((pub) => (
              <div
                key={pub.uri}
                className="flex items-center gap-3 border border-border-light rounded-md px-3 py-2"
              >
                <PublicationDetails publication={pub}>
                  <div className="text-xs text-tertiary">
                    flagged {pub.flaggedAt.slice(0, 10)}
                    {pub.automated && " by automated review"}
                    {pub.automated &&
                      pub.verdictReason &&
                      `: ${pub.verdictReason}`}
                  </div>
                </PublicationDetails>
                <ButtonSecondary
                  compact
                  disabled={busy === pub.uri}
                  onClick={() =>
                    run(pub.uri, () => clearPublicationReview({ uri: pub.uri }))
                  }
                >
                  {busy === pub.uri ? <DotLoader /> : "Unflag"}
                </ButtonSecondary>
              </div>
            ))}
          </div>
        )}
      </div>

      {cleared.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3>Cleared by automated review ({cleared.length})</h3>
          <div className="flex flex-col gap-2">
            {cleared.map((pub) => (
              <div
                key={pub.uri}
                className="flex items-center gap-3 border border-border-light rounded-md px-3 py-2"
              >
                <PublicationDetails publication={pub}>
                  <div className="text-xs text-tertiary">
                    cleared {pub.clearedAt.slice(0, 10)}
                    {pub.verdictReason && `: ${pub.verdictReason}`}
                  </div>
                </PublicationDetails>
                <ButtonSecondary
                  compact
                  disabled={busy === pub.uri}
                  onClick={() =>
                    run(pub.uri, () =>
                      reviewPublication({ uri: pub.uri, spam: true }),
                    )
                  }
                >
                  {busy === pub.uri ? <DotLoader /> : "Flag as spam"}
                </ButtonSecondary>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PublicationDetails(props: {
  publication: PublicationSummary;
  children?: React.ReactNode;
}) {
  let pub = props.publication;
  return (
    <div className="flex flex-col min-w-0 grow leading-snug">
      <a
        href={pub.url}
        target="_blank"
        rel="noreferrer"
        className="font-bold text-primary text-sm truncate hover:underline"
      >
        {pub.name || "Untitled"}
      </a>
      {pub.description && (
        <div className="text-secondary text-sm line-clamp-2">
          {pub.description}
        </div>
      )}
      <div className="text-tertiary text-xs flex flex-wrap gap-x-2">
        <a
          href={`https://bsky.app/profile/${pub.did}`}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          {pub.handle ? `@${pub.handle}` : pub.did}
        </a>
        <span>created {pub.createdAt.slice(0, 10)}</span>
      </div>
      {props.children}
    </div>
  );
}
