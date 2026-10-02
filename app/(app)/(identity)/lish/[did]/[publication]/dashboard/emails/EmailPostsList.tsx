"use client";
import { EmptyState } from "components/EmptyState";
import { Popover } from "components/Popover";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useDueRefresh } from "src/hooks/useDueRefresh";
import {
  isEmailPostFinal,
  isEmailPostSending,
  onSubscribeTrigger,
  pausedReason,
  subscriberCountLabel,
  type EmailPostSummary,
} from "src/emailPosts/types";
import type { EmailDraft } from "app/api/rpc/[command]/get_publication_data";
import { usePublicationData } from "../PublicationSWRProvider";
import { NewEmailButton } from "../NewDraftButton";
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
  let withLiveStatus = (e: EmailPostSummary) =>
    isEmailPostSending(e, now) ? { ...e, status: "sending" as const } : e;

  if (!data?.publication) return null;
  let pubUri = data.publication.uri;

  // Drafts: not yet sent, with the ones scheduled to send first, soonest
  // first. On-subscribe emails keep sending, so they get their own section.
  // An email whose draft is gone stays in sent history.
  let unsent = data.emailDrafts
    .map((d) => ({
      ...d,
      email:
        d.email && !isEmailPostFinal(d.email.status)
          ? withLiveStatus(d.email)
          : d.email,
    }))
    .filter((d) => !d.email || !isEmailPostFinal(d.email.status));
  let onSubscribe = unsent
    .filter((d) => d.email?.send_mode === "on_subscribe")
    .sort((a, b) => a.email!.audience.localeCompare(b.email!.audience));
  let drafts = unsent
    .filter((d) => d.email?.send_mode !== "on_subscribe")
    .sort((a, b) => {
      if (!a.email || !b.email) return a.email ? -1 : b.email ? 1 : 0;
      return (a.email.send_at ?? "").localeCompare(b.email.send_at ?? "");
    });
  let sent = data.emailPosts
    .map(withLiveStatus)
    .filter((e) => isEmailPostFinal(e.status))
    .sort((a, b) =>
      (b.sent_at ?? b.send_at ?? "").localeCompare(
        a.sent_at ?? a.send_at ?? "",
      ),
    );

  if (unsent.length === 0 && sent.length === 0)
    return (
      <EmptyState title="No emails yet">
        <div className="flex justify-center py-2 not-italic">
          <NewEmailButton publication={pubUri} />
        </div>
        <p className="text-tertiary text-sm">
          Send emails directly to your subscribers. These don&apos;t show on
          your post lists. You can use them for reminders, promotions, or
          events. You can also set welcome emails to be automatically sent to
          new subscribers.
        </p>
      </EmptyState>
    );

  return (
    <div className="w-full flex flex-col gap-6 pt-3 pb-6">
      <section className="flex flex-col gap-2">
        <div className="flex justify-between items-center gap-2">
          <h3 className="text-secondary">Drafts</h3>
          <div className="hidden sm:block">
            <NewEmailButton publication={pubUri} compact />
          </div>
        </div>
        {drafts.length === 0 ? (
          <EmptyState container="light">No email drafts right now</EmptyState>
        ) : (
          drafts.map((draft) => (
            <EmailDraftItem
              key={draft.leaflet}
              draft={draft}
              showPageBackground={props.showPageBackground}
            />
          ))
        )}
      </section>
      {onSubscribe.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-secondary">When Someone Subscribes</h3>
          {onSubscribe.map((draft) => (
            <EmailDraftItem
              key={draft.leaflet}
              draft={draft}
              showPageBackground={props.showPageBackground}
            />
          ))}
        </section>
      )}
      {sent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-secondary">Sent</h3>
          {sent.map((email) => (
            <SentEmailItem
              key={email.id}
              email={email}
              showPageBackground={props.showPageBackground}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function EmailDraftItem(props: {
  draft: EmailDraft;
  showPageBackground: boolean;
}) {
  let { draft } = props;
  return (
    <TimedPostItem
      leaflet={draft.leaflet}
      title={draft.title}
      description={draft.description}
      badge={
        draft.email ? (
          <EmailPostStatusBadge email={draft.email} />
        ) : (
          pill("light-container text-tertiary", "DRAFT")
        )
      }
      footer={{
        when: draft.email ? (
          <EmailPostWhen email={draft.email} />
        ) : (
          <p>Not sent yet</p>
        ),
        options:
          draft.email?.status === "sending"
            ? null
            : {
                label: draft.email ? "Send options" : "Send",
                href: `/${draft.leaflet}/email`,
              },
      }}
      showPageBackground={props.showPageBackground}
    />
  );
}

function SentEmailItem(props: {
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
      footer={{
        when: <EmailPostWhen email={email} />,
        options: { label: "Details", href: `/${email.leaflet}/email` },
      }}
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
  if (email.status === "failed") return <p>Failed to send</p>;
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
