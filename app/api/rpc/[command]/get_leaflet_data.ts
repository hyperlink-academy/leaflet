import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";

export type GetLeafletDataReturnType = Awaited<
  ReturnType<(typeof get_leaflet_data)["handler"]>
>;
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
        permission_token_rights(*),
        custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*),
        leaflets_in_publications(*, publications(*)) `,
      )
      .eq("id", token_id)
      .single();

    return { result: res };
  },
});
