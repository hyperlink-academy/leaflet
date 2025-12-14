import { idResolver } from "app/(home-pages)/reader/idResolver";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabs } from "./ProfileTabs";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { ProfileLayout } from "./ProfileLayout";
import { Agent } from "@atproto/api";
import { get_profile_data } from "app/api/rpc/[command]/get_profile_data";

export default async function ProfilePageLayout(props: {
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
  let profileData = await get_profile_data.handler(
    { didOrHandle: did },
    { supabase: supabaseServerClient },
  );
  let { publications, profile } = profileData.result;

  if (!profile) return null;

  return (
    <DashboardLayout
      id="profile"
      defaultTab="default"
      currentPage="profile"
      actions={null}
      tabs={{
        default: {
          controls: null,
          content: (
            <ProfileLayout>
              <ProfileHeader
                profile={profile}
                publications={publications || []}
              />
              <ProfileTabs didOrHandle={params.didOrHandle} />
              <div className="h-full pt-3 pb-4 px-3 sm:px-4 flex flex-col">
                {props.children}
              </div>
            </ProfileLayout>
          ),
        },
      }}
    />
  );
}

export type ProfileData = {
  did: string;
  handle: string | null;
  indexed_at: string;
  record: Json;
};
