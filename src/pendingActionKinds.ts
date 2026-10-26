export const pendingActionKinds = {
  questions: {
    one: "question",
    other: "questions",
    pending: { one: "unanswered question", other: "unanswered questions" },
  },
  replies: {
    one: "reply",
    other: "replies",
    pending: {
      one: "reply awaiting approval",
      other: "replies awaiting approval",
    },
  },
} as const;

export type PendingActionKind = keyof typeof pendingActionKinds;

export type PostPendingActions = Partial<Record<PendingActionKind, number>>;

export type PendingActions = Record<string, PostPendingActions>;

export type PublicationsPendingActions = Record<string, PendingActions>;

const kinds = Object.keys(pendingActionKinds) as PendingActionKind[];

export function pendingActionTotal(actions: PostPendingActions | undefined) {
  return Object.values(actions ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
}

export function combinePendingActions(
  actions: PendingActions | undefined,
): PostPendingActions {
  let combined: PostPendingActions = {};
  for (let post of Object.values(actions ?? {}))
    for (let kind of kinds)
      if (post[kind]) combined[kind] = (combined[kind] ?? 0) + post[kind];
  return combined;
}

export function pendingActionEntries(actions: PostPendingActions) {
  return kinds.flatMap((kind) => {
    let n = actions[kind];
    return n ? [{ kind, n, label: pendingActionKinds[kind] }] : [];
  });
}

export function describePendingActions(actions: PostPendingActions) {
  let parts = pendingActionEntries(actions).map(
    ({ n, label }) => `${n} ${n === 1 ? label.one : label.other}`,
  );
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
    : parts[0] ?? "";
}
