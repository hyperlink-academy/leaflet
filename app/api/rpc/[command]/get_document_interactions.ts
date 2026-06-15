import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getConstellationBacklinks } from "app/(app)/lish/[did]/[publication]/[rkey]/getPostPageData";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { AtUri } from "@atproto/syntax";
import { getProfiles } from "src/identity";

export const get_document_interactions = makeRoute({
  route: "get_document_interactions",
  input: z.object({
    document_uri: z.string(),
  }),
  handler: async (
    { document_uri },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    let { data: document } = await supabase
      .from("documents")
      .select(
        `
        data,
        uri,
        comments_on_documents(*),
        document_mentions_in_bsky(*),
        documents_in_publications(publications(*))
        `,
      )
      .eq("uri", document_uri)
      .limit(1)
      .single();

    if (!document) {
      return {
        comments: [],
        quotesAndMentions: [],
        totalMentionsCount: 0,
        document: null,
        publication: null,
      };
    }

    const normalizedData = normalizeDocumentRecord(
      document.data,
      document.uri,
    );

    const pub = document.documents_in_publications?.[0]?.publications;
    const normalizedPubRecord = pub
      ? normalizePublicationRecord(pub.record)
      : null;

    // Compute document URL for constellation lookup
    let absoluteUrl = "";
    if (normalizedData) {
      const postUrl = getDocumentURL(
        normalizedData,
        document.uri,
        normalizedPubRecord,
      );
      absoluteUrl = postUrl.startsWith("/")
        ? `https://leaflet.pub${postUrl}`
        : postUrl;
    }

    // Fetch constellation backlinks
    const constellationBacklinks = absoluteUrl
      ? await getConstellationBacklinks(absoluteUrl)
      : [];

    // Deduplicate constellation backlinks internally
    const uniqueBacklinks = Array.from(
      new Map(constellationBacklinks.map((b) => [b.uri, b])).values(),
    );

    // Combine DB mentions and constellation backlinks, deduplicating by URI
    const dbMentionUris = new Set(
      document.document_mentions_in_bsky.map((m) => m.uri),
    );
    const quotesAndMentions: { uri: string; link?: string }[] = [
      ...document.document_mentions_in_bsky.map((m) => ({
        uri: m.uri,
        link: m.link,
      })),
      ...uniqueBacklinks.filter((b) => !dbMentionUris.has(b.uri)),
    ];

    const commentDids = Array.from(
      new Set(document.comments_on_documents.map((c) => new AtUri(c.uri).host)),
    );
    const profiles = await getProfiles(commentDids);
    const comments = document.comments_on_documents.map((c) => {
      const did = new AtUri(c.uri).host;
      const p = profiles.get(did);
      return {
        ...c,
        profile: p
          ? {
              did: p.did,
              handle: p.handle,
              displayName: p.displayName,
              avatar: p.avatar,
            }
          : null,
      };
    });

    return {
      comments,
      quotesAndMentions,
      totalMentionsCount: quotesAndMentions.length,
      document: normalizedData,
      publication: normalizedPubRecord,
    };
  },
});
