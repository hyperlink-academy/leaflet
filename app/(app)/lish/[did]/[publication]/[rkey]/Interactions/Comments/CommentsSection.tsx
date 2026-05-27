import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { getProfiles } from "src/identity";
import { CommentsDrawerContent, type Comment } from "./index";

export async function CommentsSection({
  document_uri,
}: {
  document_uri: string;
}) {
  const { data: rows } = await supabaseServerClient
    .from("comments_on_documents")
    .select("uri, record")
    .eq("document", document_uri);

  const safeRows = rows ?? [];
  const dids = Array.from(
    new Set(safeRows.map((c) => new AtUri(c.uri).host)),
  );
  const profiles = await getProfiles(dids);

  const comments: Comment[] = safeRows.map((c) => {
    const did = new AtUri(c.uri).host;
    const p = profiles.get(did);
    return {
      uri: c.uri,
      record: c.record,
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

  return (
    <CommentsDrawerContent
      document_uri={document_uri}
      comments={comments}
    />
  );
}

export function CommentsSkeleton() {
  return null;
}
