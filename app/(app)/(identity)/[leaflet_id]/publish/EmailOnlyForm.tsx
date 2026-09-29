"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Separator } from "react-aria-components";
import { startOfToday } from "date-fns";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import { Popover } from "components/Popover";
import { DatePicker, TimePicker } from "components/DatePicker";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import {
  cancelEmailPost,
  saveEmailPost,
} from "actions/publications/emailPosts";
import type { EmailPostSend, SaveEmailPostError } from "src/emailPosts/save";
import {
  isEmailPostFinal,
  latestSendAt,
  onSubscribeTrigger,
  pausedReason,
  subscriberCountLabel,
  type EmailPostAudience,
  type EmailPostSummary,
} from "src/emailPosts/types";
import type { EmailOnlyIneligibleReason } from "src/emailPosts/eligibility";
import { EmailPreview } from "./ShareOptions";

type SendOn = EmailPostSend["mode"];

const sendOnLabels: Record<SendOn, string> = {
  now: "Now",
  scheduled: "Date & time",
  on_subscribe: "When someone subscribes",
};

const audienceLabels: Record<EmailPostAudience, string> = {
  all: "All subscribers",
  free: "Free subscribers",
  paid: "Paid members",
};

const errorCopy: Record<SaveEmailPostError, string> = {
  unauthorized: "You don't have permission to send email for this publication.",
  newsletter_not_enabled: "Email mode isn't turned on for this publication.",
  not_pro: "Sending as email is a Leaflet Pro feature.",
  not_a_draft: "Only unpublished drafts can be sent as an email.",
  already_sent: "This email has already been sent.",
  invalid_send_at: "Pick a send time in the next year.",
  on_subscribe_taken:
    "There's already an email that sends when these readers subscribe. Cancel that one first, or pick a different audience.",
  database_error: "Something went wrong. Please try again!",
};

// An hour from now, on the hour: a sensible first pick for "Date & time".
function defaultSendAt() {
  let d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

export function EmailOnlyForm(props: {
  leaflet_id: string;
  root_entity: string;
  publication_uri: string;
  title: string;
  description: string;
  subscriberCount?: number;
  membershipsEnabled: boolean;
  ineligibleReason: EmailOnlyIneligibleReason | null;
  existing: EmailPostSummary | null;
  onSaved: (email: EmailPostSummary) => void;
  onCanceled: () => void;
}) {
  let { existing } = props;
  // A "now" send stores send_at too; one that's still editable (paused) has a
  // past send_at and should reopen as "now", not as an invalid date.
  let [sendOn, setSendOn] = useState<SendOn>(() =>
    existing?.send_mode === "on_subscribe"
      ? "on_subscribe"
      : existing?.send_at && new Date(existing.send_at).getTime() > Date.now()
        ? "scheduled"
        : "now",
  );
  let [sendAt, setSendAt] = useState<Date>(() =>
    sendOn === "scheduled" && existing?.send_at
      ? new Date(existing.send_at)
      : defaultSendAt(),
  );
  let [audience, setAudience] = useState<EmailPostAudience>(
    existing?.audience ?? "all",
  );
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);

  if (existing && isEmailPostFinal(existing.status))
    return <SentEmailDetails email={existing} />;

  // An existing email stays manageable (paused, cancelable) without Pro.
  if (!existing && props.ineligibleReason === "not_pro")
    return (
      <div className="flex flex-col gap-2">
        <p className="text-secondary">
          Sending a post only as an email — without publishing it — is a Leaflet
          Pro feature.
        </p>
        <Link href="/upgrade" className="font-bold">
          Learn about Leaflet Pro
        </Link>
      </div>
    );

  async function submit() {
    if (loading) return;
    if (
      sendOn === "scheduled" &&
      (sendAt.getTime() <= Date.now() || sendAt > latestSendAt())
    ) {
      setError(errorCopy.invalid_send_at);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let result = await saveEmailPost({
        publication_uri: props.publication_uri,
        leaflet_id: props.leaflet_id,
        title: props.title,
        description: props.description,
        send:
          sendOn === "scheduled"
            ? { mode: "scheduled", send_at: sendAt.toISOString() }
            : { mode: sendOn },
        audience,
      });
      if (result.ok) props.onSaved(result.value);
      else setError(errorCopy[result.error]);
    } catch (e) {
      console.error(e);
      setError(errorCopy.database_error);
    }
    setLoading(false);
  }

  let submitLabel = existing
    ? "Update Email"
    : sendOn === "now"
      ? "Send Email"
      : sendOn === "scheduled"
        ? "Schedule Email"
        : "Turn On Email";

  return (
    // Not a <form>: Enter in the test-email field must never send the email.
    <div className="flex flex-col gap-3">
      {existing?.status === "paused" && (
        <div className="accent-container px-3 py-2 text-sm text-secondary">
          {pausedReason(existing.error)} Update it to resume.
        </div>
      )}
      {existing?.status === "active" && existing.subscriber_count ? (
        <div className="text-sm text-tertiary">
          Sent to {subscriberCountLabel(existing.subscriber_count)} so far.
        </div>
      ) : null}

      <Row label="Subject">
        <div className="font-bold text-secondary text-right">
          {props.title || "Untitled"}
        </div>
      </Row>
      <hr className="border-border-light" />

      <Row label="Send on">
        <PickerMenu
          labels={sendOnLabels}
          value={sendOn}
          onChange={(v) => {
            setSendOn(v);
            setError(null);
          }}
        />
      </Row>
      {sendOn === "scheduled" && (
        <Row label="">
          <SendAtPicker sendAt={sendAt} setSendAt={setSendAt} />
        </Row>
      )}
      {sendOn === "on_subscribe" && (
        <p className="text-sm text-tertiary -mt-2 text-right">
          Sent once to each reader, {onSubscribeTrigger(audience)}.
        </p>
      )}

      {props.membershipsEnabled && (
        <>
          <hr className="border-border-light" />
          <Row label="To">
            <PickerMenu
              labels={audienceLabels}
              value={audience}
              onChange={setAudience}
            />
          </Row>
        </>
      )}
      {!props.membershipsEnabled && props.subscriberCount !== undefined && (
        <>
          <hr className="border-border-light" />
          <Row label="To">
            <div className="font-bold text-secondary">
              {subscriberCountLabel(props.subscriberCount)}
            </div>
          </Row>
        </>
      )}

      <hr className="border-border-light" />
      <div className="flex flex-col gap-1">
        <div className="text-tertiary">Test email</div>
        <EmailPreview
          publication_uri={props.publication_uri}
          root_entity={props.root_entity}
          leaflet_id={props.leaflet_id}
          title={props.title}
          description={props.description}
          emailOnly
        />
      </div>
      <p className="text-sm text-tertiary">
        This post won&apos;t be published to your publication or Bluesky — it
        only goes to your subscribers&apos; inboxes.
      </p>
      <hr className="border-border mb-2" />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <Link
            className="hover:no-underline! font-bold"
            href={`/${props.leaflet_id}`}
          >
            Back
          </Link>
          <div className="flex items-center gap-3">
            {existing && (
              <CancelEmailButton
                leaflet_id={props.leaflet_id}
                onCanceled={props.onCanceled}
              />
            )}
            <ButtonPrimary
              type="button"
              className="h-[30px]"
              disabled={loading}
              onClick={submit}
            >
              {loading ? <DotLoader className="h-[23px]" /> : submitLabel}
            </ButtonPrimary>
          </div>
        </div>
        {error && (
          <div className="text-right text-sm text-accent-contrast leading-snug">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// Node and browsers format clock times with different invisible whitespace,
// so the server renders the date alone and the time joins after hydration.
function useSendTimeLabel(iso: string) {
  let loaded = useHasPageLoaded();
  return useLocalizedDate(iso, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(loaded ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <div className="text-tertiary shrink-0">{props.label}</div>
      {props.children}
    </div>
  );
}

function PickerMenu<T extends string>(props: {
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Menu
      asChild
      align="end"
      trigger={
        <button
          type="button"
          className="flex items-center gap-1 font-bold text-secondary hover:underline"
        >
          {props.labels[props.value]}
          <ArrowDownTiny />
        </button>
      }
    >
      <RadioMenuGroup
        value={props.value}
        onValueChange={(v) => props.onChange(v as T)}
      >
        {(Object.keys(props.labels) as T[]).map((key) => (
          <RadioMenuItem key={key} value={key} selected={key === props.value}>
            {props.labels[key]}
          </RadioMenuItem>
        ))}
      </RadioMenuGroup>
    </Menu>
  );
}

function SendAtPicker(props: { sendAt: Date; setSendAt: (d: Date) => void }) {
  let label = useSendTimeLabel(props.sendAt.toISOString());
  let time = `${props.sendAt.getHours().toString().padStart(2, "0")}:${props.sendAt.getMinutes().toString().padStart(2, "0")}`;
  return (
    <Popover
      className="w-64 px-2!"
      align="end"
      trigger={
        <div className="text-secondary font-bold hover:underline">{label}</div>
      }
    >
      <div className="flex flex-col gap-3">
        <DatePicker
          selected={props.sendAt}
          onSelect={(date: Date | undefined) => {
            if (!date) return;
            let next = new Date(props.sendAt);
            next.setFullYear(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
            );
            props.setSendAt(next);
          }}
          disabled={(date: Date) =>
            date < startOfToday() || date > latestSendAt()
          }
        />
        <Separator className="border-border" />
        <div className="flex gap-4 pb-1 items-center">
          <TimePicker
            value={time}
            onChange={(value) => {
              let [hours, minutes] = value.split(":").map((n) => parseInt(n));
              if (isNaN(hours) || isNaN(minutes)) return;
              let next = new Date(props.sendAt);
              next.setHours(hours, minutes, 0, 0);
              props.setSendAt(next);
            }}
          />
        </div>
      </div>
    </Popover>
  );
}

function CancelEmailButton(props: {
  leaflet_id: string;
  onCanceled: () => void;
}) {
  let [confirming, setConfirming] = useState(false);
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);
  if (!confirming)
    return (
      <ButtonTertiary type="button" onClick={() => setConfirming(true)}>
        Cancel Email
      </ButtonTertiary>
    );
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-tertiary">{error ?? "Move back to drafts?"}</span>
      <button
        type="button"
        className="font-bold text-accent-contrast"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          let result = await cancelEmailPost(props.leaflet_id);
          setLoading(false);
          if (result.ok) props.onCanceled();
          else
            setError(
              result.error === "already_sent"
                ? "It's already been sent."
                : "Couldn't cancel it.",
            );
        }}
      >
        {loading ? <DotLoader /> : "Yes"}
      </button>
      <button
        type="button"
        className="text-tertiary"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
      >
        No
      </button>
    </div>
  );
}

function SentEmailDetails(props: { email: EmailPostSummary }) {
  let { email } = props;
  let sentAt = useSendTimeLabel(email.sent_at ?? email.send_at ?? "");
  let count = subscriberCountLabel(email.subscriber_count);
  let params = useParams();
  return (
    <div className="flex flex-col gap-3">
      <Row label="Subject">
        <div className="font-bold text-secondary text-right">
          {email.title || "Untitled"}
        </div>
      </Row>
      <hr className="border-border-light" />
      <Row label={email.status === "failed" ? "Status" : "Sent"}>
        <div className="font-bold text-secondary text-right">
          {email.status === "sent"
            ? `${sentAt} to ${count}`
            : email.status === "sending"
              ? `Sending to ${count}…`
              : "This send failed."}
        </div>
      </Row>
      {email.status === "failed" && (
        <p className="text-sm text-tertiary">
          Contact us at{" "}
          <a href="mailto:contact@leaflet.pub">contact@leaflet.pub</a> and
          we&apos;ll sort it out.
        </p>
      )}
      <p className="text-sm text-tertiary">
        Edits to this post won&apos;t be sent — the email has already gone out.
      </p>
      <hr className="border-border mb-2" />
      <Link
        className="hover:no-underline! font-bold"
        href={`/${params.leaflet_id}`}
      >
        Back
      </Link>
    </div>
  );
}
