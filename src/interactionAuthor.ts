import type { Profile } from "src/identity";

// Who wrote a question, answer or reply, as the interaction blocks show them
export type InteractionAuthor = Pick<
  Profile,
  "did" | "handle" | "displayName" | "avatar"
>;

export function interactionAuthor(
  did: string,
  profiles: Map<string, Profile | null>,
): InteractionAuthor {
  const profile = profiles.get(did);
  return {
    did,
    handle: profile?.handle ?? null,
    displayName: profile?.displayName ?? null,
    avatar: profile?.avatar ?? null,
  };
}
