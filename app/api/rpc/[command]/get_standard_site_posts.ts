import { z } from "zod";
import { AtUri } from "@atproto/syntax";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

export type StandardSitePostData = {
  uri: string;
  record: NormalizedDocument;
  publication: {
    uri: string;
    record: NormalizedPublication | null;
  } | null;
  author: {
    did: string;
    handle: string | null;
    displayName: string | null;
  } | null;
  commentsCount: number;
  mentionsCount: number;
  recommendsCount: number;
};

export type GetStandardSitePostsReturnType = Awaited<
  ReturnType<(typeof get_standard_site_posts)["handler"]>
>;

export const get_standard_site_posts = makeRoute({
  route: "get_standard_site_posts",
  input: z.object({
    uris: z.array(z.string()).max(100),
  }),
  handler: async ({ uris }, { supabase }: Pick<Env, "supabase">) => {
    if (uris.length === 0) return { result: { posts: [] } };

    const { data: documents } = await supabase
      .from("documents")
      .select(
        `
        uri,
        data,
        comments_on_documents(count),
        document_mentions_in_bsky(count),
        recommends_on_documents(count),
        documents_in_publications(publications(uri, record))
        `,
      )
      .in("uri", uris);

    const dids = Array.from(
      new Set(
        (documents || [])
          .map((d) => {
            try {
              return new AtUri(d.uri).host;
            } catch {
              return null;
            }
          })
          .filter((did): did is string => !!did),
      ),
    );

    const { data: profiles } = dids.length
      ? await supabase
          .from("bsky_profiles")
          .select("did, handle, record")
          .in("did", dids)
      : { data: [] as { did: string; handle: string | null; record: unknown }[] };

    const profileByDid = new Map(
      (profiles || []).map((p) => [p.did, p] as const),
    );

    const posts: StandardSitePostData[] = (documents || [])
      .map((d): StandardSitePostData | null => {
        const normalized = normalizeDocumentRecord(d.data, d.uri);
        if (!normalized) return null;

        const pubRow = d.documents_in_publications?.[0]?.publications;
        const publication = pubRow
          ? { uri: pubRow.uri, record: normalizePublicationRecord(pubRow.record) }
          : null;

        let did: string | null;
        try {
          did = new AtUri(d.uri).host;
        } catch {
          did = null;
        }
        const profile = did ? profileByDid.get(did) : undefined;
        const profileRecord = (profile?.record ?? null) as
          | { displayName?: string }
          | null;
        const author = did
          ? {
              did,
              handle: profile?.handle ?? null,
              displayName: profileRecord?.displayName ?? null,
            }
          : null;

        return {
          uri: d.uri,
          record: normalized,
          publication,
          author,
          commentsCount: d.comments_on_documents?.[0]?.count || 0,
          mentionsCount: d.document_mentions_in_bsky?.[0]?.count || 0,
          recommendsCount: d.recommends_on_documents?.[0]?.count || 0,
        };
      })
      .filter((p): p is StandardSitePostData => p !== null);

    return { result: { posts } };
  },
});
