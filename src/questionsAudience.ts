// Who a questions or reply block takes submissions from; see
// pub.leaflet.blocks.questions and pub.leaflet.blocks.reply.
export const QUESTIONS_AUDIENCES = [
  "anyone",
  "subscribers",
  "follows",
  "followers",
] as const;
export type QuestionsAudience = (typeof QUESTIONS_AUDIENCES)[number];

export function isQuestionsAudience(
  value: unknown,
): value is QuestionsAudience {
  return QUESTIONS_AUDIENCES.includes(value as QuestionsAudience);
}

export function questionsAudience(value: unknown): QuestionsAudience {
  return isQuestionsAudience(value) ? value : "anyone";
}

export const QUESTIONS_AUDIENCE_LABELS: Record<
  QuestionsAudience,
  { label: string; description: string }
> = {
  anyone: { label: "Anyone", description: "Any Atmosphere account." },
  subscribers: {
    label: "Subscribers",
    description: "Only readers subscribed to your publication.",
  },
  follows: {
    label: "People you follow",
    description: "Only accounts you follow on Bluesky.",
  },
  followers: {
    label: "Your followers",
    description: "Only accounts following you on Bluesky.",
  },
};

// Shown to readers of a questions or reply block
export function audienceNotice(
  audience: QuestionsAudience,
  submissions: "questions" | "replies",
) {
  if (audience === "subscribers")
    return `Only subscribers can submit ${submissions}.`;
  if (audience === "follows")
    return `Only people the author follows can submit ${submissions}.`;
  if (audience === "followers")
    return `Only the author's followers can submit ${submissions}.`;
  return null;
}
