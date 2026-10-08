// Who a questions block takes questions from; see pub.leaflet.blocks.questions.
export const QUESTIONS_AUDIENCES = ["anyone", "follows", "followers"] as const;
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
  anyone: { label: "Anyone", description: "Any Atmosphere account can ask." },
  follows: {
    label: "People you follow",
    description: "Only accounts you follow on Bluesky can ask.",
  },
  followers: {
    label: "Your followers",
    description: "Only accounts following you on Bluesky can ask.",
  },
};

// Shown to readers under the composer
export function questionsAudienceNotice(audience: QuestionsAudience) {
  if (audience === "follows") return "Only people the author follows can ask.";
  if (audience === "followers") return "Only the author's followers can ask.";
  return null;
}
