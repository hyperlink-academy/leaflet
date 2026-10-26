// Things on a published post that are waiting for its author to act on them.
// Unlike notifications they have no read state: an item counts until it's
// dealt with. To add a kind, add it here and give it a counter in
// src/pendingActions.ts; every indicator picks it up.
export const pendingActionKinds = {
  questions: {
    one: "question",
    other: "questions",
    // What needs doing, for listing what's pending
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

// One post's pending items by kind; kinds with none are left out.
export type PostPendingActions = Partial<Record<PendingActionKind, number>>;

// Keyed by document at-uri; posts with nothing pending are left out.
export type PendingActions = Record<string, PostPendingActions>;

// Keyed by publication uri; publications with nothing pending are left out.
export type PublicationsPendingActions = Record<string, PendingActions>;

const kinds = Object.keys(pendingActionKinds) as PendingActionKind[];

export function pendingActionTotal(actions: PostPendingActions | undefined) {
  return Object.values(actions ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
}

// Several posts' pending items added up by kind, e.g. a whole publication's.
export function combinePendingActions(
  actions: PendingActions | undefined,
): PostPendingActions {
  let combined: PostPendingActions = {};
  for (let post of Object.values(actions ?? {}))
    for (let kind of kinds)
      if (post[kind]) combined[kind] = (combined[kind] ?? 0) + post[kind];
  return combined;
}

// Each kind with its count, in a stable order.
export function pendingActionEntries(actions: PostPendingActions) {
  return kinds.flatMap((kind) => {
    let n = actions[kind];
    return n ? [{ kind, n, label: pendingActionKinds[kind] }] : [];
  });
}

// e.g. "2 questions and 1 reply"
export function describePendingActions(actions: PostPendingActions) {
  let parts = pendingActionEntries(actions).map(
    ({ n, label }) => `${n} ${n === 1 ? label.one : label.other}`,
  );
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
    : parts[0] ?? "";
}
