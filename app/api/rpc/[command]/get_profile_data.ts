import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import { supabaseServerClient } from "supabase/serverClient";
import { Agent } from "@atproto/api";
import { getIdentityData } from "actions/getIdentityData";
import { createOauthClient } from "src/atproto-oauth";
import {
  normalizePublicationRow,
  hasValidPublication,
} from "src/utils/normalizeRecords";
import { deduplicateByUri } from "src/utils/deduplicateRecords";

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
    let agent;
    let authed_identity = await getIdentityData();
    if (authed_identity?.atp_did) {
      try {
        const oauthClient = await createOauthClient();
        let credentialSession = await oauthClient.restore(
          authed_identity.atp_did,
        );
        agent = new Agent(credentialSession);
      } catch (e) {
        agent = new Agent({
          service: "https://public.api.bsky.app",
        });
      }
    } else {
      agent = new Agent({
        service: "https://public.api.bsky.app",
      });
    }

    let profileReq = agent.app.bsky.actor.getProfile({ actor: did });

    let publicationsReq = supabase
      .from("publications")
      .select("*")
      .eq("identity_did", did);

    let [{ data: profile }, { data: rawPublications }] = await Promise.all([
      profileReq,
      publicationsReq,
    ]);

    // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
    const publications = deduplicateByUri(rawPublications || []);

    // Normalize publication records before returning
    const normalizedPublications = publications
      .map(normalizePublicationRow)
      .filter(hasValidPublication);

    return {
      result: {
        profile,
        publications: normalizedPublications,
      },
    };
  },
});
