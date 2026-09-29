"use client";
import { Fragment } from "react";
import { EmptyState } from "components/EmptyState";
import { SpeedyLink } from "components/SpeedyLink";
import { Popover } from "components/Popover";
import { EditTiny } from "components/Icons/EditTiny";
import { ClockTiny } from "components/Icons/ClockTiny";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  onSubscribeTrigger,
  pausedReason,
  subscriberCountLabel,
  type EmailPostSummary,
} from "src/emailPosts/types";
import { usePublicationData } from "../PublicationSWRProvider";

export function EmailPostsList(props: { showPageBackground: boolean }) {
  let { data } = usePublicationData();
  let emailPosts = data?.emailPosts ?? [];
  if (!data?.publication) return null;
  if (emailPosts.length === 0)
    return (
      <EmptyState title="No emails yet">
        <p className="text-tertiary text-sm">
          Choose &quot;Send as email&quot; when publishing a draft to send it
          only to your subscribers&apos; inboxes.
        </p>
      </EmptyState>
    );

  // Upcoming (unsent) emails first, soonest first; then sent, newest first.
  let upcoming = emailPosts
    .filter((e) => !e.sent_at)
    .sort((a, b) => (a.send_at ?? "").localeCompare(b.send_at ?? ""));
  let sent = emailPosts
    .filter((e) => e.sent_at)
    .sort((a, b) => b.sent_at!.localeCompare(a.sent_at!));

  return (
    <div className="w-full flex flex-col gap-2 pt-3 pb-6">
      {[...upcoming, ...sent].map((email) => (
        <EmailPostItem
          key={email.id}
          email={email}
          showPageBackground={props.showPageBackground}
        />
      ))}
    </div>
  );
}

function EmailPostItem(props: {
  email: EmailPostSummary;
  showPageBackground: boolean;
}) {
  let { email, showPageBackground } = props;
  return (
    <Fragment>
      <div
        className={`grow flex flex-col rounded-lg border ${showPageBackground ? "border-border-light py-1 px-2" : "border-transparent px-1"}`}
        style={{
          backgroundColor: showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : "transparent",
        }}
      >
        <div className="flex justify-between gap-2">
          <SpeedyLink
            className="hover:no-underline!"
            href={`/${email.leaflet}`}
          >
            <h3 className="text-primary grow leading-snug">
              {email.title || "Untitled"}
            </h3>
          </SpeedyLink>
          <div className="flex items-center gap-2">
            <EmailPostStatusBadge email={email} />
            <SpeedyLink href={`/${email.leaflet}`}>
              <EditTiny />
            </SpeedyLink>
          </div>
        </div>
        {email.description ? (
          <p className="italic text-secondary">{email.description}</p>
        ) : null}
        <div className="text-sm text-tertiary flex gap-3 justify-between items-center pt-3">
          <EmailPostWhen email={email} />
          <SpeedyLink
            className="font-bold text-accent-contrast"
            href={`/${email.leaflet}/publish`}
          >
            {email.sent_at || email.status === "sending"
              ? "Details"
              : "Send options"}
          </SpeedyLink>
        </div>
      </div>
      {!showPageBackground && (
        <hr className="last:hidden border-border-light" />
      )}
    </Fragment>
  );
}

// Date-only: this renders on the server too, where the viewer's clock time
// isn't known. The badge popover carries the time.
function EmailPostWhen(props: { email: EmailPostSummary }) {
  let { email } = props;
  let date = useLocalizedDate(email.sent_at ?? email.send_at ?? "", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
  if (email.send_mode === "on_subscribe")
    return (
      <p>
        Sends {onSubscribeTrigger(email.audience)}
        {email.subscriber_count
          ? ` · sent to ${subscriberCountLabel(email.subscriber_count)}`
          : ""}
      </p>
    );
  if (email.sent_at)
    return (
      <p>
        Sent {date} to {subscriberCountLabel(email.subscriber_count)}
      </p>
    );
  if (email.status === "sending") return <p>Sending now</p>;
  return <p>Scheduled for {date}</p>;
}

export function EmailPostStatusBadge(props: { email: EmailPostSummary }) {
  let { email } = props;
  let sendAt = useLocalizedDate(email.send_at ?? "", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  let pill = (className: string, label: string, clock?: boolean) => (
    <div
      className={`flex items-center gap-1 font-bold text-xs px-1.5 ${className}`}
    >
      {clock && <ClockTiny className="shrink-0 scale-75" />}
      {label}
    </div>
  );
  switch (email.status) {
    case "scheduled":
      return (
        <Popover
          trigger={pill(
            "light-container text-accent-contrast",
            "SCHEDULED",
            true,
          )}
        >
          <p className="text-sm text-tertiary">Sends {sendAt}</p>
        </Popover>
      );
    case "active":
      return (
        <Popover
          trigger={pill("light-container text-accent-contrast", "ACTIVE", true)}
        >
          <p className="text-sm text-tertiary">
            Sent once to each reader, {onSubscribeTrigger(email.audience)}.
          </p>
        </Popover>
      );
    case "paused":
      return (
        <Popover
          trigger={pill("light-container text-tertiary", "PAUSED", true)}
        >
          <p className="text-sm text-tertiary">
            {pausedReason(email.error)} Open its send options and update it to
            resume.
          </p>
        </Popover>
      );
    case "sending":
      return pill("light-container text-accent-contrast", "SENDING…");
    case "sent":
      return pill("accent-container text-accent-contrast", "SENT");
    case "failed":
      return (
        <Popover
          trigger={pill(
            "accent-container text-accent-2! bg-accent-1!",
            "FAILED",
          )}
        >
          <p className="text-sm text-tertiary">
            An error occurred with this send. Contact us at{" "}
            <a href="mailto:contact@leaflet.pub">contact@leaflet.pub</a>
          </p>
        </Popover>
      );
  }
}
