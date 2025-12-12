import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import { supabaseServerClient } from "supabase/serverClient";
import { Agent } from "@atproto/api";

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

    let agent = new Agent({
      service: "https://public.api.bsky.app",
    });
    let profileReq = agent.app.bsky.actor.getProfile({ actor: did });

    let publicationsReq = supabaseServerClient
      .from("publications")
      .select("*")
      .eq("identity_did", did);

    let [{ data: profile }, { data: publications }] = await Promise.all([
      profileReq,
      publicationsReq,
    ]);

    return {
      result: {
        profile,
        publications: publications || [],
      },
    };
  },
});
