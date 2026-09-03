import { notFound, redirect } from "next/navigation";
import { idResolver } from "src/identity";
import { getProfilePosts } from "./getProfilePosts";
import { ProfilePostsContent } from "./PostsContent";

export default async function ProfilePostsPage(props: {
  params: Promise<{ didOrHandle: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  if (!didOrHandle.startsWith("did:")) {
    let resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) notFound();
    // Canonicalize handle URLs onto the DID form so a profile is one
    // indexable URL instead of one per handle spelling.
    redirect(`/p/${encodeURIComponent(resolved)}`);
  }

  const { posts, nextCursor } = await getProfilePosts(didOrHandle);

  return (
    <ProfilePostsContent
      did={didOrHandle}
      posts={posts}
      nextCursor={nextCursor}
    />
  );
}
