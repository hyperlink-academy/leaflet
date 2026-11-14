import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "supabase/database.types";
import { tombstoneRecord } from "./tombstoneComment";

type StoredComment = { uri: string; record: Json };

const parentOf = (comment: StoredComment) =>
  (comment.record as { reply?: { parent?: string } } | null)?.reply?.parent;

export function hiddenCommentPlaceholders(
  hidden: StoredComment[],
  live: StoredComment[],
  tombstones: StoredComment[],
) {
  let parents = new Map(
    [...hidden, ...live, ...tombstones].map((c) => [c.uri, parentOf(c)]),
  );
  let hasLiveReply = new Set<string>();
  for (let comment of live) {
    let parent = parentOf(comment);
    while (parent && !hasLiveReply.has(parent)) {
      hasLiveReply.add(parent);
      parent = parents.get(parent);
    }
  }
  return hidden
    .filter((c) => hasLiveReply.has(c.uri))
    .map((c) => ({
      uri: c.uri,
      record: tombstoneRecord(c.record),
      profile: null,
      deleted: true,
      hidden: true,
    }));
}

// Moves the document's comments in or out of hidden_comments to match its
// visibility rows.
export async function syncHiddenComments(
  supabase: SupabaseClient<Database>,
  document: string,
) {
  let { error } = await supabase.rpc("sync_hidden_comments", { doc: document });
  if (error) console.error("[comments] hidden comment sync failed", error);
}

export async function mirrorCommentAuthorModeration(
  supabase: SupabaseClient<Database>,
  uri: string,
  subject: string,
  hidden: Iterable<string>,
) {
  await supabase
    .from("document_comment_author_moderation")
    .delete()
    .eq("subject", subject);
  let rows = [...new Set(hidden)].map((comment) => ({ uri, subject, comment }));
  if (rows.length > 0) {
    let { error } = await supabase
      .from("document_comment_author_moderation")
      .upsert(rows);
    if (error) console.error("[comments] visibility row upsert failed", error);
  }
  await syncHiddenComments(supabase, subject);
}
