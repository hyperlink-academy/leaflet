import { idResolver } from "app/(home-pages)/reader/idResolver";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { ProfilePageLayout } from "./ProfilePageLayout";
import { supabaseServerClient } from "supabase/serverClient";
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
  let { data: profile } = await supabaseServerClient
    .from("bsky_profiles")
    .select(`*`)
    .eq("did", did)
    .single();

  return <ProfilePageLayout profile={profile} />;
}
