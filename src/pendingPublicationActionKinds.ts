export const pendingPublicationActionKinds = {
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

export type PendingPublicationActionKind =
  keyof typeof pendingPublicationActionKinds;

export type PostPendingPublicationActions = Partial<
  Record<PendingPublicationActionKind, number>
>;

export type PendingPublicationActions = Record<
  string,
  PostPendingPublicationActions
>;

export type PublicationsWithPendingActions = Record<
  string,
  PendingPublicationActions
>;

const kinds = Object.keys(
  pendingPublicationActionKinds,
) as PendingPublicationActionKind[];

export function pendingPublicationActionTotal(
  actions: PostPendingPublicationActions | undefined,
) {
  return Object.values(actions ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
}

export function combinePendingPublicationActions(
  actions: PendingPublicationActions | undefined,
): PostPendingPublicationActions {
  let combined: PostPendingPublicationActions = {};
  for (let post of Object.values(actions ?? {}))
    for (let kind of kinds)
      if (post[kind]) combined[kind] = (combined[kind] ?? 0) + post[kind];
  return combined;
}

export function pendingPublicationActionEntries(
  actions: PostPendingPublicationActions,
) {
  return kinds.flatMap((kind) => {
    let n = actions[kind];
    return n ? [{ kind, n, label: pendingPublicationActionKinds[kind] }] : [];
  });
}

export function describePendingPublicationActions(
  actions: PostPendingPublicationActions,
) {
  let parts = pendingPublicationActionEntries(actions).map(
    ({ n, label }) => `${n} ${n === 1 ? label.one : label.other}`,
  );
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
    : parts[0] ?? "";
}
