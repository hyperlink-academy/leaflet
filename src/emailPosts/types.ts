import type { Database } from "supabase/database.types";

export type EmailPostSendMode = "scheduled" | "on_subscribe";
export type EmailPostAudience = "all" | "free" | "paid";
// scheduled → sending → sent | failed for a one-off send; an on-subscribe
// email sits in active. Either pauses when the publication stops being
// eligible (email mode off, or its owner loses Pro) until the author saves it
// again.
export type EmailPostStatus =
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "paused"
  | "active";

export type EmailPostRow =
  Database["public"]["Tables"]["publication_email_posts"]["Row"];

export const EMAIL_POST_SUMMARY_COLUMNS =
  "id, leaflet, title, description, send_mode, send_at, audience, status, subscriber_count, sent_at, error, updated_at";

export type EmailPostSummary = Pick<
  EmailPostRow,
  | "id"
  | "leaflet"
  | "title"
  | "description"
  | "send_at"
  | "subscriber_count"
  | "sent_at"
  | "error"
  | "updated_at"
> & {
  send_mode: EmailPostSendMode;
  audience: EmailPostAudience;
  status: EmailPostStatus;
};

// Bounded by how long an Inngest function can sleep before sending.
export function latestSendAt() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Statuses whose send options can still change; anything else (sending, sent,
// failed) is history.
export const UNSENT_EMAIL_POST_STATUSES: EmailPostStatus[] = [
  "scheduled",
  "active",
  "paused",
];

export function isEmailPostFinal(status: EmailPostStatus) {
  return !UNSENT_EMAIL_POST_STATUSES.includes(status);
}

// When an on-subscribe email goes out, for the audience it's aimed at.
export function onSubscribeTrigger(audience: EmailPostAudience) {
  if (audience === "paid") return "when someone becomes a paid member";
  if (audience === "free") return "when someone subscribes for free";
  return "when someone subscribes";
}

export function subscriberCountLabel(n: number | null) {
  if (n === null) return "subscribers";
  return `${n.toLocaleString()} ${n === 1 ? "subscriber" : "subscribers"}`;
}

// Why a paused email is paused; `error` holds the ineligible reason.
export function pausedReason(error: string | null) {
  if (error === "not_pro")
    return "The publication's owner no longer has Leaflet Pro.";
  return "Email mode is turned off for this publication.";
}
