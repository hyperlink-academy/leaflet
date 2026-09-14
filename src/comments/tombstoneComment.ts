import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "supabase/database.types";
import type { PubLeafletComment } from "lexicons/api";

// Moves a comment out of comments_on_documents into comment_tombstones so it
// drops out of every count while replies to it can still be threaded under a
// placeholder. Safe to run twice (the author's delete action and the firehose
// delete event both call it).
export async function tombstoneComment(
  supabase: SupabaseClient<Database>,
  uri: string,
): Promise<{ document: string | null } | null> {
  let { data: comment } = await supabase
    .from("comments_on_documents")
    .select("document, record")
    .eq("uri", uri)
    .maybeSingle();
  if (!comment) return null;

  let record = comment.record as PubLeafletComment.Record;
  let tombstone: Json = {
    $type: "pub.leaflet.comment",
    subject: record.subject,
    createdAt: record.createdAt,
    ...(record.onPage ? { onPage: record.onPage } : {}),
    ...(record.reply ? { reply: { parent: record.reply.parent } } : {}),
  };
  await supabase
    .from("comment_tombstones")
    .upsert(
      { uri, document: comment.document, record: tombstone },
      { onConflict: "uri", ignoreDuplicates: true },
    );
  await supabase.from("comments_on_documents").delete().eq("uri", uri);
  return { document: comment.document };
}
