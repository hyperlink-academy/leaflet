import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { CommentsDrawerContent, type Comment } from "./index";
import { AtUri } from "@atproto/syntax";

export async function CommentsSection({
  document_uri,
}: {
  document_uri: string;
}) {
  const { data: rows } = await supabaseServerClient
    .from("comments_on_documents")
    .select("uri, record ")
    .eq("document", document_uri);

  const dids = (rows ?? []).map((c) => new AtUri(c.uri).host);
  const profiles = await getProfiles([...new Set(dids)]);

  const comments: Comment[] = (rows ?? []).map((c) => ({
    uri: c.uri,
    record: c.record,
    profile: profiles.get(new AtUri(c.uri).host) ?? null,
  }));

  return (
    <CommentsDrawerContent document_uri={document_uri} comments={comments} />
  );
}
