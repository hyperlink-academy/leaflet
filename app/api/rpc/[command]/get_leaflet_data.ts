import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";

export type GetLeafletDataReturnType = Awaited<
  ReturnType<(typeof get_leaflet_data)["handler"]>
>;

const leaflets_in_publications_query = `leaflets_in_publications(*, publications(*, documents_in_publications(count)), documents(*))`;
export const get_leaflet_data = makeRoute({
  route: "get_leaflet_data",
  input: z.object({
    token_id: z.string(),
  }),

  handler: async ({ token_id }, { supabase }: Pick<Env, "supabase">) => {
    let res = await supabase
      .from("permission_tokens")
      .select(
        `*,
        permission_token_rights(*, entity_sets(permission_tokens(${leaflets_in_publications_query}))),
        custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*),
        ${leaflets_in_publications_query}`,
      )
      .eq("id", token_id)
      .single();

    type t = typeof res;
    type data = Exclude<t["data"], null>;

    //All of these shenanigans are to make entity_set optional so that we don't have to write it when we create this data elsewhere, mainly in LeafletList
    return {
      result: res as Omit<t, "data"> & {
        data:
          | null
          | (Omit<data, "permission_token_rights"> & {
              permission_token_rights: (Omit<
                data["permission_token_rights"][0],
                "entity_sets"
              > & {
                entity_sets?: data["permission_token_rights"][0]["entity_sets"];
              })[];
            });
      },
    };
  },
});
