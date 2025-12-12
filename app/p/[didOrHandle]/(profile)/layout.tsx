import { idResolver } from "app/(home-pages)/reader/idResolver";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabs } from "./ProfileTabs";
import { ProfileDashboardLayout } from "./ProfileDashboardLayout";

export default async function ProfileLayout(props: {
  params: Promise<{ didOrHandle: string }>;
  children: React.ReactNode;
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
  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select("*")
    .eq("identity_did", did);

  if (!profile) return null;

  return (
    <ProfileDashboardLayout did={did}>
      <div className="h-full">
        <div
          className={`
          max-w-prose mx-auto w-full h-full
          flex flex-col
          border border-border-light rounded-lg
          text-center mt-8`}
        >
          <ProfileHeader profile={profile} publications={publications || []} />
          <ProfileTabs didOrHandle={params.didOrHandle} />
          <div className="h-full overflow-y-scroll pt-3 pb-4 px-3 sm:px-4 flex flex-col">
            {props.children}
          </div>
        </div>
      </div>
    </ProfileDashboardLayout>
  );
}

export type ProfileData = {
  did: string;
  handle: string | null;
  indexed_at: string;
  record: Json;
};
