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
