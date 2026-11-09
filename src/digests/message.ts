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
  test = true,
) {
  const subject = `Quick digest on ${name}`;
  const period = previousEnd
    ? test
      ? `since your last digest (${new Date(previousEnd).toUTCString()})`
      : `since ${new Date(previousEnd).toUTCString()}`
    : "since starting";
  const text = [
    subject,
    "",
    ...Object.entries(labels).map(
      ([key, label]) =>
        `${label}: +${activity[key as keyof DigestActivity]} ${period}`,
    ),
    "",
    "Likes are Leaflet recommendations.",
    test
      ? "This test digest was requested by you."
      : "You opted into email digests in your publication’s notification settings.",
  ].join("\n");
  return { subject, text };
}
