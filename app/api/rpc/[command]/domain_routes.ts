import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { NextApiResponse } from "next";

export const get_domain_status = makeRoute({
  route: "get_domain_status",
  input: z.object({
    domain: z.string(),
  }),
  handler: async ({ domain }, { vercel }: Pick<Env, "vercel">) => {
    try {
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
    } catch (e) {
      console.log(e);
      let errorResponse = e as NextApiResponse;
      if (errorResponse.statusCode === 404)
        return { error: "Not Found" } as const;
      return { error: true };
    }
  },
});

export const get_leaflet_subdomain_status = makeRoute({
  route: "get_leaflet_subdomain_status",
  input: z.object({
    domain: z.string(),
  }),
  handler: async ({ domain }, { vercel }: Pick<Env, "vercel">) => {
    try {
      let c = await vercel.projects.getProjectDomain({
        idOrName: "prj_9jX4tmYCISnm176frFxk07fF74kG",
        teamId: "team_42xaJiZMTw9Sr7i0DcLTae9d",
        domain: `${domain}.leaflet.pub`,
      });
      return { config: c };
    } catch (e) {
      console.log(e);
      let errorResponse = e as NextApiResponse;
      if (errorResponse.statusCode === 404)
        return { error: "Not Found" } as const;
      return { error: true };
    }
  },
});
