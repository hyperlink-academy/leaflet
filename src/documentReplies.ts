import { AtUri } from "@atproto/syntax";
import {
  get_standard_site_posts,
  type StandardSitePostData,
} from "app/api/rpc/[command]/get_standard_site_posts";
import { supabaseServerClient } from "supabase/serverClient";

export const MAX_REPLIES = 500;

export type DocumentReply = {
  // at-uri of the pub.leaflet.interactions.reply record
  uri: string;
  visible: boolean;
  // Submitted by the viewer
  mine: boolean;
  post: StandardSitePostData;
};

export type DocumentReplies = {
  // The viewer owns the document and moderates its replies
  isAuthor: boolean;
  replies: DocumentReply[];
};

export function isDocumentOwner(documentUri: string, did: string) {
  try {
    return new AtUri(documentUri).host === did;
  } catch {
    return false;
  }
}

// Readers get the replies the author made visible plus their own
// submissions; the author gets everything, pending included. A null viewer
// gets the public list, which is what cached pages render.
export async function loadDocumentReplies(
  subject: string,
  viewer: string | null,
): Promise<DocumentReplies> {
  const [{ data: rows }, { data: allowedRows }] = await Promise.all([
    supabaseServerClient
      .from("document_replies")
      .select("uri, document, replier_did")
      .eq("subject", subject)
      .order("indexed_at", { ascending: true })
      .limit(MAX_REPLIES),
    supabaseServerClient
      .from("document_reply_visibility")
      .select("reply")
      .eq("subject", subject),
  ]);
  const isAuthor = !!viewer && isDocumentOwner(subject, viewer);
  const allowed = new Set((allowedRows ?? []).map((r) => r.reply));

  const shown = (rows ?? [])
    .map((r) => ({
      uri: r.uri,
      document: r.document,
      visible: allowed.has(r.uri),
      mine: !!viewer && r.replier_did === viewer,
    }))
    .filter((r) => isAuthor || r.visible || r.mine);
  if (shown.length === 0) return { isAuthor, replies: [] };

  const {
    result: { posts },
  } = await get_standard_site_posts.handler(
    { uris: shown.map((r) => r.document) },
    { supabase: supabaseServerClient },
  );
  const postsByUri = new Map(posts.map((p) => [p.uri, p]));

  return {
    isAuthor,
    replies: shown.flatMap(({ document, ...reply }) => {
      const post = postsByUri.get(document);
      return post ? [{ ...reply, post }] : [];
    }),
  };
}
