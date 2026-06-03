import { z } from "zod";
import { makeRoute } from "../lib";
import { getProfiles, type Profile } from "src/identity";

export type GetProfilesReturnType = Awaited<
  ReturnType<(typeof get_profiles)["handler"]>
>;

// Basic (non-hydrated) Bluesky profiles for a set of DIDs. Returns the shared
// Profile shape (handle/displayName/avatar), batched and Redis-cached via
// getProfiles. Use get_profile_data instead when you need the full hydrated
// profile + publications for a single actor.
export const get_profiles = makeRoute({
  route: "get_profiles",
  input: z.object({
    dids: z.array(z.string()),
  }),
  handler: async ({ dids }) => {
    let profiles = await getProfiles(dids);
    return {
      result: {
        profiles: Object.fromEntries(profiles) as Record<
          string,
          Profile | null
        >,
      },
    };
  },
});
