import type { GatePolicy } from "src/membership";

// Who a questions or reply block takes submissions from; see
// pub.leaflet.blocks.questions and pub.leaflet.blocks.reply. Subscribers,
// paid and tiers narrow in turn, like a members-only delimiter's GatePolicy.
export const QUESTIONS_AUDIENCES = [
  "anyone",
  "subscribers",
  "paid",
  "tiers",
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

export function isMembershipAudience(audience: QuestionsAudience) {
  return (
    audience === "subscribers" || audience === "paid" || audience === "tiers"
  );
}

export function audienceTierIds(block: { tierIds?: unknown }): string[] {
  return Array.isArray(block.tierIds)
    ? [
        ...new Set(
          block.tierIds.filter((id): id is string => typeof id === "string"),
        ),
      ]
    : [];
}

// The membership rule a subscriber-based audience applies, or null for the
// others.
export function audienceGatePolicy(
  audience: QuestionsAudience,
  tierIds: string[],
): GatePolicy | null {
  if (audience === "subscribers" || audience === "paid") return { audience };
  if (audience === "tiers") return { audience, tierIds };
  return null;
}

// The "who can submit" options; paid and tiers are picked within subscribers.
export const QUESTIONS_AUDIENCE_LABELS: Record<
  Exclude<QuestionsAudience, "paid" | "tiers">,
  string
> = {
  anyone: "Anyone",
  subscribers: "Publication Subscribers",
  follows: "Your Bluesky Follows",
  followers: "Your Bluesky Followers",
};

// Who can submit, for the author's empty-block notice
export const AUDIENCE_SUBMITTERS: Record<QuestionsAudience, string> = {
  anyone: "Anyone",
  subscribers: "Subscribers",
  paid: "Paid members",
  tiers: "Selected paid members",
  follows: "People you follow",
  followers: "Your followers",
};

// Joins tier names into "Gold", "Gold and Silver", "Gold, Silver and Bronze"
export function listTierNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Shown to readers of a questions or reply block. `tierNames` names the tiers
// of a "tiers" audience.
export function audienceNotice(
  audience: QuestionsAudience,
  submissions: "questions" | "replies",
  tierNames: string[] = [],
) {
  if (audience === "subscribers")
    return `Only subscribers can submit ${submissions}.`;
  if (audience === "paid")
    return `Only paid members can submit ${submissions}.`;
  if (audience === "tiers")
    return tierNames.length > 0
      ? `Only ${listTierNames(tierNames)} members can submit ${submissions}.`
      : `Only selected paid members can submit ${submissions}.`;
  if (audience === "follows")
    return `Only people the author follows can submit ${submissions}.`;
  if (audience === "followers")
    return `Only the author's followers can submit ${submissions}.`;
  return null;
}
