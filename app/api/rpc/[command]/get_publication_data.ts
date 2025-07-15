import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { AtUri } from "@atproto/syntax";

export type GetPublicationDataReturnType = Awaited<
  ReturnType<(typeof get_publication_data)["handler"]>
>;
export const get_publication_data = makeRoute({
  route: "get_publication_data",
  input: z.object({
    did: z.string(),
    publication_name: z.string(),
  }),
  handler: async (
    { did, publication_name },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    let uri;
    if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
      uri = AtUri.make(
        did,
        "pub.leaflet.publication",
        publication_name,
      ).toString();
    }
    let { data: publication, error } = await supabase
      .from("publications")
      .select(
        `*,
        documents_in_publications(documents(*)),
        publication_subscriptions(*, identities(bsky_profiles(*))),
        publication_domains(*),
        leaflets_in_publications(*,
          permission_tokens(*,
            permission_token_rights(*),
            custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*)
         )
        )`,
      )
      .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
      .eq("identity_did", did)
      .single();

    return { result: publication };
  },
});
