import { idResolver } from "app/(home-pages)/reader/idResolver";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { ProfilePageLayout } from "./ProfilePageLayout";
import { supabaseServerClient } from "supabase/serverClient";
import { getProfilePosts } from "./getProfilePosts";

export default async function ProfilePage(props: {
  params: Promise<{ didOrHandle: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;

  if (!didOrHandle.startsWith("did:")) {
    let resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) {
      return (
        <NotFoundLayout>
          <p className="font-bold">Sorry, can&apos;t resolve handle!</p>
          <p>
            This may be a glitch on our end. If the issue persists please{" "}
            <a href="mailto:contact@leaflet.pub">send us a note</a>.
          </p>
        </NotFoundLayout>
      );
    }
    did = resolved;
  }

  // Fetch profile, publications, and initial posts in parallel
  let [{ data: profile }, { data: pubs }, { posts, nextCursor }] =
    await Promise.all([
      supabaseServerClient
        .from("bsky_profiles")
        .select(`*`)
        .eq("did", did)
        .single(),
      supabaseServerClient
        .from("publications")
        .select("*")
        .eq("identity_did", did),
      getProfilePosts(did),
    ]);

  return (
    <ProfilePageLayout
      profile={profile}
      publications={pubs || []}
      posts={posts}
      nextCursor={nextCursor}
    />
  );
}
