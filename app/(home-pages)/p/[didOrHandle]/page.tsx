import { idResolver } from "app/(home-pages)/reader/idResolver";
import { getProfilePosts } from "./getProfilePosts";
import { ProfilePostsContent } from "./PostsContent";

export default async function ProfilePostsPage(props: {
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

  const { posts, nextCursor } = await getProfilePosts(did);

  return (
    <ProfilePostsContent did={did} posts={posts} nextCursor={nextCursor} />
  );
}
