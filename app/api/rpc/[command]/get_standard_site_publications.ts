import { z } from "zod";
import { AtUri } from "@atproto/syntax";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { getProfiles } from "src/identity";
import { toBylineProfiles } from "src/utils/byline";

export type StandardSitePublicationData = {
  uri: string;
  record: NormalizedPublication;
  // The publication owner (the DID that owns the AT URI), resolved to a profile.
  author: {
    did: string;
    handle: string | null;
    displayName: string | null;
  } | null;
};

export type GetStandardSitePublicationsReturnType = Awaited<
  ReturnType<(typeof get_standard_site_publications)["handler"]>
>;

export const get_standard_site_publications = makeRoute({
  route: "get_standard_site_publications",
  input: z.object({
    uris: z.array(z.string()).max(100),
  }),
  handler: async ({ uris }, { supabase }: Pick<Env, "supabase">) => {
    if (uris.length === 0) return { result: { publications: [] } };

    const { data: rows } = await supabase
      .from("publications")
      .select("uri, record")
      .in("uri", uris);

    const dids = Array.from(
      new Set(
        (rows || []).flatMap((r) => {
          try {
            return [new AtUri(r.uri).host];
          } catch {
            return [];
          }
        }),
      ),
    );

    const profiles = await getProfiles(dids);

    const publications: StandardSitePublicationData[] = (rows || [])
      .map((r): StandardSitePublicationData | null => {
        const record = normalizePublicationRecord(r.record);
        if (!record) return null;

        let did: string | null;
        try {
          did = new AtUri(r.uri).host;
        } catch {
          did = null;
        }
        const author = did ? toBylineProfiles([did], profiles)[0] : null;

        return { uri: r.uri, record, author };
      })
      .filter((p): p is StandardSitePublicationData => p !== null);

    return { result: { publications } };
  },
});
