import {
  getDocumentPages,
  normalizeDocumentRecord,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import { truncatePagesAtMembersDelimiter } from "src/membership";
import type { BylineProfile } from "src/utils/byline";

export type PublicationPostsListPost = {
  uri: string;
  record: NormalizedDocument;
  commentsCount: number;
  mentionsCount: number;
  recommendsCount: number;
  membersOnly: boolean;
  // Byline profiles resolved server-side (in order). When present, the list
  // renders these directly; when absent (editor / theme preview) the component
  // resolves them on the client via useContributorProfiles.
  bylineProfiles?: BylineProfile[];
};

/**
 * Builds the post list for a publication home page from its joined
 * `documents_in_publications` rows: normalizes each document record and pulls
 * the comment / mention / recommend counts, dropping rows that can't be
 * normalized. Shared by every publication-home render path (custom page,
 * legacy fallback, theme preview) so they stay in sync. Enrich the result with
 * `attachBylineProfiles` to add server-resolved contributor profiles.
 *
 * Lives in a non-client module so server components can call it directly
 * (the `PublicationPostsList` client component re-exports it for convenience).
 */
export function buildPublicationPosts(
  documentsInPublications:
    | Array<{
        members_only?: boolean | null;
        documents: {
          uri: string;
          data: unknown;
          comments_on_documents?: { count: number }[] | null;
          document_mentions_in_bsky?: { count: number }[] | null;
          recommends_on_documents?: { count: number }[] | null;
        } | null;
      }>
    | null
    | undefined,
): PublicationPostsListPost[] {
  return (documentsInPublications ?? [])
    .map((dip) => {
      if (!dip.documents) return null;
      const normalized = normalizeDocumentRecord(
        dip.documents.data,
        dip.documents.uri,
      );
      if (!normalized) return null;
      // These records ship to the client for list previews (title, first
      // paragraph, cover) — never include a members-only post's gated blocks.
      if (dip.members_only) {
        const pages = getDocumentPages(normalized);
        if (pages) truncatePagesAtMembersDelimiter(pages);
      }
      return {
        uri: dip.documents.uri,
        record: normalized,
        commentsCount: dip.documents.comments_on_documents?.[0]?.count || 0,
        mentionsCount: dip.documents.document_mentions_in_bsky?.[0]?.count || 0,
        recommendsCount: dip.documents.recommends_on_documents?.[0]?.count || 0,
        membersOnly: dip.members_only ?? false,
      };
    })
    .filter((p): p is PublicationPostsListPost => p !== null);
}
