import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "supabase/database.types";
import {
  DOCUMENT_EVENT,
  documentEventsTopic,
  type DocumentEventKind,
} from "./index";

// A lost event only means readers wait for their next refetch, so this never
// throws into a write path. Sending on an unjoined channel goes over HTTP;
// no socket is held open.
export async function broadcastDocumentEvent(
  supabase: SupabaseClient<Database>,
  kind: DocumentEventKind,
  subject: string,
) {
  let channel;
  try {
    channel = supabase.channel(documentEventsTopic(subject));
    await channel.send({
      type: "broadcast",
      event: DOCUMENT_EVENT,
      payload: { kind, subject },
    });
  } catch (e) {
    console.error("[document-events] broadcast failed", e);
  } finally {
    if (channel) await supabase.removeChannel(channel).catch(() => {});
  }
}
