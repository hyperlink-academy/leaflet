import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { NextApiResponse } from "next";
import { VERCEL_PROJECT, VERCEL_TEAM } from "src/vercel";

export const get_domain_status = makeRoute({
  route: "get_domain_status",
  input: z.object({
    domain: z.string(),
  }),
  handler: async ({ domain }, { vercel }: Pick<Env, "vercel">) => {
    try {
      let [projectDomain, config] = await Promise.all([
        vercel.projects.getProjectDomain({
          idOrName: VERCEL_PROJECT,
          teamId: VERCEL_TEAM,
          domain,
        }),
        vercel.domains.getDomainConfig({
          domain,
          teamId: VERCEL_TEAM,
        }),
      ]);

      if (!projectDomain.verified) {
        // Vercel only re-checks ownership and kicks off certificate issuance
        // when the verify endpoint is POSTed (the dashboard's refresh button
        // does this) — pending domains otherwise stay pending indefinitely.
        try {
          let result = await vercel.projects.verifyProjectDomain({
            idOrName: VERCEL_PROJECT,
            teamId: VERCEL_TEAM,
            domain,
          });
          if (result.verified) return { config };
        } catch (e) {
          console.log(e);
        }
        if (!projectDomain.verification) {
          return { config };
        }
        return {
          verification: projectDomain.verification,
          config,
        } as const;
      }
      return { config };
    } catch (e) {
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
        idOrName: VERCEL_PROJECT,
        teamId: VERCEL_TEAM,
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
