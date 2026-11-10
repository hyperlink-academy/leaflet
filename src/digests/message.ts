import type { DigestActivity } from "./activity";
import { createElement } from "react";
import { DigestEmail } from "emails/digest";
import { renderEmail } from "emails/renderEmail";

const labels: Record<keyof DigestActivity, string> = {
  subscribers: "Subscribers",
  likes: "Likes",
  comments: "Comments",
  mentions: "Mentions",
  post_questions: "Post questions",
  quotes: "Quotes",
};

export async function digestMessage(
  name: string,
  activity: DigestActivity,
  previousEnd: string | null,
  test = true,
) {
  const subject = `Quick digest on ${name}`;
  const period = previousEnd
    ? test
      ? `since your last digest (${new Date(previousEnd).toUTCString()})`
      : `since ${new Date(previousEnd).toUTCString()}`
    : "since starting";
  const items = Object.entries(labels).map(([key, label]) => ({
    label,
    count: activity[key as keyof DigestActivity],
  }));
  const note = test
    ? "This test digest was requested by you."
    : "You opted into email digests in your publication’s notification settings.";
  const text = [
    subject,
    period,
    "",
    ...items.map(({ label, count }) => `${label}: +${count}`),
    "",
    "Likes are Leaflet recommendations.",
    note,
  ].join("\n");
  const html = await renderEmail(
    createElement(DigestEmail, { subject, period, items, note }),
  );
  return { subject, text, html };
}
