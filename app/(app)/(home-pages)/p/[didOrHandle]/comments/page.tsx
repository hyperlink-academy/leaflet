import { Suspense } from "react";
import { idResolver } from "src/identity";
import { getProfileComments } from "./getProfileComments";
import { ProfileCommentsContent } from "./CommentsContent";

export default async function ProfileCommentsPage(props: {
  params: Promise<{ didOrHandle: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    let resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) return null;
    did = resolved;
  }

  return (
    <Suspense fallback={<ProfileCommentsSkeleton />}>
      <ProfileCommentsLoader did={did} />
    </Suspense>
  );
}

async function ProfileCommentsLoader({ did }: { did: string }) {
  const { comments, nextCursor } = await getProfileComments(did);
  return (
    <ProfileCommentsContent
      did={did}
      comments={comments}
      nextCursor={nextCursor}
    />
  );
}

function ProfileCommentsSkeleton() {
  return null;
}
