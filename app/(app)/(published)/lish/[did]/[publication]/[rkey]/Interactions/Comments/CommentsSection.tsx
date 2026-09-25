import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { CommentsDrawerContent, type Comment } from "./index";
import { AtUri } from "@atproto/syntax";

export async function CommentsSection({
  document_uri,
}: {
  document_uri: string;
}) {
  const { data: document } = await supabaseServerClient
    .from("documents")
    .select(
      "comments_on_documents(uri, record, past_versions), comment_tombstones(uri, record)",
    )
    .eq("uri", document_uri)
    .maybeSingle();
  const rows = document?.comments_on_documents ?? [];
  const tombstones = document?.comment_tombstones ?? [];

  const dids = rows.map((c) => new AtUri(c.uri).host);
  const profiles = await getProfiles([...new Set(dids)]);

  const comments: Comment[] = [
    ...rows.map((c) => ({
      uri: c.uri,
      record: c.record,
      profile: profiles.get(new AtUri(c.uri).host) ?? null,
      edited: Array.isArray(c.past_versions) && c.past_versions.length > 0,
    })),
    ...tombstones.map((c) => ({
      uri: c.uri,
      record: c.record,
      profile: null,
      deleted: true,
    })),
  ];

  return (
    <CommentsDrawerContent document_uri={document_uri} comments={comments} />
  );
}
