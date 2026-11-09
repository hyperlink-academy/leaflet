import type { DigestActivity } from "./activity";

const labels: Record<keyof DigestActivity, string> = {
  subscribers: "Subscribers",
  likes: "Likes",
  comments: "Comments",
  mentions: "Mentions",
  post_questions: "Post questions",
  quotes: "Quotes",
};

export function digestMessage(
  name: string,
  activity: DigestActivity,
  previousEnd: string | null,
) {
  const subject = `Quick digest on ${name}`;
  const period = previousEnd
    ? `since your last digest (${new Date(previousEnd).toUTCString()})`
    : "since starting";
  const text = [
    subject,
    "",
    ...Object.entries(labels).map(
      ([key, label]) =>
        `${label}: +${activity[key as keyof DigestActivity]} ${period}`,
    ),
    "",
    "Likes are Leaflet recommendations. This test digest was requested by you.",
  ].join("\n");
  return { subject, text };
}
