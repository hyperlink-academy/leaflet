import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { idResolver } from "app/(home-pages)/reader/idResolver";

export type GetProfileDataReturnType = Awaited<
  ReturnType<(typeof get_profile_data)["handler"]>
>;

export const get_profile_data = makeRoute({
  route: "get_profile_data",
  input: z.object({
    didOrHandle: z.string(),
  }),
  handler: async ({ didOrHandle }, { supabase }: Pick<Env, "supabase">) => {
    // Resolve handle to DID if necessary
    let did = didOrHandle;

    if (!didOrHandle.startsWith("did:")) {
      const resolved = await idResolver.handle.resolve(didOrHandle);
      if (!resolved) {
        throw new Error("Could not resolve handle to DID");
      }
      did = resolved;
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("bsky_profiles")
      .select("*")
      .eq("did", did)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Fetch publications for the DID
    const { data: publications, error: publicationsError } = await supabase
      .from("publications")
      .select("*")
      .eq("identity_did", did);

    if (publicationsError) {
      throw new Error(
        `Failed to fetch publications: ${publicationsError.message}`,
      );
    }

    return {
      result: {
        profile,
        publications: publications || [],
      },
    };
  },
});
