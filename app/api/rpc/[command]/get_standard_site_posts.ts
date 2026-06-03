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
import { getProfiles } from "src/identity";
import {
  getBylineDids,
  hasExplicitByline,
  toBylineProfiles,
} from "src/utils/byline";

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
  // Byline contributors (resolved from record.contributors), in order. Empty
  // when the post has no explicit contributors — consumers should fall back to
  // `author` in that case.
  contributors: {
    did: string;
    handle: string | null;
    displayName: string | null;
  }[];
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

    // Normalize once up front so we can collect both author (URI host) and
    // contributor DIDs into a single batched profile lookup.
    const normalizedByUri = new Map<string, NormalizedDocument>();
    for (const d of documents || []) {
      const normalized = normalizeDocumentRecord(d.data, d.uri);
      if (normalized) normalizedByUri.set(d.uri, normalized);
    }

    const dids = Array.from(
      new Set(
        (documents || []).flatMap((d) => {
          const out: string[] = [];
          try {
            out.push(new AtUri(d.uri).host);
          } catch {
            // ignore malformed uri
          }
          const contributors = normalizedByUri.get(d.uri)?.contributors;
          if (contributors) out.push(...contributors.map((c) => c.did));
          return out;
        }),
      ),
    );

    const profiles = await getProfiles(dids);

    const posts: StandardSitePostData[] = (documents || [])
      .map((d): StandardSitePostData | null => {
        const normalized = normalizedByUri.get(d.uri);
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
        const author = did
          ? toBylineProfiles([did], profiles)[0]
          : null;
        // Only expose contributors when the byline is more than just the
        // single author/owner; otherwise consumers fall back to `author`
        // (byte-for-byte identical to the previous single-author behavior).
        const contributors =
          did && hasExplicitByline(normalized, did)
            ? toBylineProfiles(getBylineDids(normalized, did), profiles)
            : [];

        return {
          uri: d.uri,
          record: normalized,
          publication,
          author,
          contributors,
          commentsCount: d.comments_on_documents?.[0]?.count || 0,
          mentionsCount: d.document_mentions_in_bsky?.[0]?.count || 0,
          recommendsCount: d.recommends_on_documents?.[0]?.count || 0,
        };
      })
      .filter((p): p is StandardSitePostData => p !== null);

    return { result: { posts } };
  },
});
