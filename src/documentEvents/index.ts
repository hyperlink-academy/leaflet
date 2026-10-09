import { AtUri } from "@atproto/syntax";

// Live hints that something public changed on a published document: a
// question asked or answered, a reply submitted or moderated, a comment
// posted. They flow over one supabase realtime broadcast topic per repo (the
// author's account), derivable from the document uri alone on both ends.
// Per repo rather than one global topic because supabase bills every
// delivered message: a global topic would deliver each event to every
// connected reader of every blog.
//
// An event is a hint, not data. Both the appview (from the firehose) and the
// app's own actions emit one for the same write, so receivers refetch rather
// than apply it, which makes the duplicate harmless.
export type DocumentEventKind =
  | "question"
  | "answer"
  | "reply"
  | "reply_visibility"
  | "comment";

export type DocumentEvent = { kind: DocumentEventKind; subject: string };

export const DOCUMENT_EVENT = "document";

export function documentEventsTopic(subject: string) {
  return `doc-events:${new AtUri(subject).host}`;
}
