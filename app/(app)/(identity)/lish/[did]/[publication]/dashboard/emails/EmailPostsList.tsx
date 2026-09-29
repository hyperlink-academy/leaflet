"use client";
import { EmptyState } from "components/EmptyState";
import { Popover } from "components/Popover";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useDueRefresh } from "src/hooks/useDueRefresh";
import {
  isEmailPostSending,
  onSubscribeTrigger,
  pausedReason,
  subscriberCountLabel,
  type EmailPostSummary,
} from "src/emailPosts/types";
import { usePublicationData } from "../PublicationSWRProvider";
import { TimedPostItem, statusPill as pill } from "../TimedPostItem";

export function EmailPostsList(props: { showPageBackground: boolean }) {
  let { data, mutate } = usePublicationData();
  let now = useDueRefresh(
    (data?.emailPosts ?? []).map((e) => ({
      status: e.status,
      dueAt: e.send_at,
    })),
    "sending",
    mutate,
  );
  let emailPosts = (data?.emailPosts ?? []).map((e) =>
    isEmailPostSending(e, now) ? { ...e, status: "sending" as const } : e,
  );

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
  let { email } = props;
  return (
    <TimedPostItem
      leaflet={email.leaflet}
      title={email.title}
      description={email.description}
      badge={<EmailPostStatusBadge email={email} />}
      when={<EmailPostWhen email={email} />}
      optionsLabel={
        email.sent_at || email.status === "sending" ? "Details" : "Send options"
      }
      showPageBackground={props.showPageBackground}
    />
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
