import { z } from "zod";
import { makeRoute } from "../lib";
import { Env } from "./route";

export const get_domain_status = makeRoute({
  route: "get_domain_status",
  input: z.object({
    domain: z.string(),
  }),
  handler: async ({ domain }, { vercel }: Pick<Env, "vercel">) => {
    let [status, config] = await Promise.all([
      vercel.domains.getDomain({
        domain,
        teamId: "team_42xaJiZMTw9Sr7i0DcLTae9d",
      }),
      vercel.domains.getDomainConfig({
        domain,
        teamId: "team_42xaJiZMTw9Sr7i0DcLTae9d",
      }),
    ]);

    return { status, config };
  },
});

export const get_leaflet_domains = makeRoute({
  route: "get_leaflet_domains",
  input: z.object({ id: z.string() }),
  handler: async ({ id }, { supabase }: Env) => {
    let res = await supabase
      .from("permission_tokens")
      .select(
        "*, permission_token_rights(*), custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*) ",
      )
      .eq("id", id)
      .single();
    return res.data?.custom_domain_routes || null;
  },
});
