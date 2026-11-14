import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "supabase/database.types";
import type { PubLeafletComment } from "lexicons/api";

// Just enough of a comment's record to place a placeholder in the thread.
export function tombstoneRecord(stored: Json): Json {
  let record = stored as PubLeafletComment.Record;
  return {
    $type: "pub.leaflet.comment",
    subject: record.subject,
    createdAt: record.createdAt,
    ...(record.onPage ? { onPage: record.onPage } : {}),
    ...(record.reply ? { reply: { parent: record.reply.parent } } : {}),
  };
}

// Moves a comment out of comments_on_documents (or hidden_comments, if the
// document's author hid it) into comment_tombstones so it drops out of every
// count while replies to it can still be threaded under a placeholder. Safe
// to run twice (the author's delete action and the firehose delete event both
// call it).
export async function tombstoneComment(
  supabase: SupabaseClient<Database>,
  uri: string,
): Promise<{ document: string | null } | null> {
  let table: "comments_on_documents" | "hidden_comments" =
    "comments_on_documents";
  let { data: comment } = await supabase
    .from(table)
    .select("document, record")
    .eq("uri", uri)
    .maybeSingle();
  if (!comment) {
    table = "hidden_comments";
    ({ data: comment } = await supabase
      .from(table)
      .select("document, record")
      .eq("uri", uri)
      .maybeSingle());
  }
  if (!comment) return null;

  await supabase.from("comment_tombstones").upsert(
    {
      uri,
      document: comment.document,
      record: tombstoneRecord(comment.record),
    },
    { onConflict: "uri", ignoreDuplicates: true },
  );
  await supabase.from(table).delete().eq("uri", uri);
  return { document: comment.document };
}
