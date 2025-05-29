import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";

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
    let { data: publication } = await supabase
      .from("publications")
      .select(
        `*,
        documents_in_publications(documents(*)),
        publication_domains(*),
        leaflets_in_publications(*,
          permission_tokens(*,
            permission_token_rights(*),
            custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*)
         )
        )`,
      )
      .eq("identity_did", did)
      .eq("name", publication_name)
      .single();

    return { result: publication };
  },
});
