import { idResolver } from "src/identity";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabs } from "./ProfileTabs";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { ProfileLayout } from "./ProfileLayout";
import { Agent } from "@atproto/api";
import { get_profile_data } from "app/api/rpc/[command]/get_profile_data";
import { Metadata } from "next";
import { cache, Suspense } from "react";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { Avatar } from "components/Avatar";
import { FullPageLoading } from "components/PageLayouts/DashboardLoading";
import { BlockMailboxSmall } from "components/Icons/BlockMailboxSmall";
import { TrendingSmall } from "components/Icons/TrendingSmall";
import { NewSmall } from "components/Icons/NewSmall";

// Cache the profile data call to prevent concurrent OAuth restores
const getCachedProfileData = cache(async (did: string) => {
  return get_profile_data.handler(
    { didOrHandle: did },
    { supabase: supabaseServerClient },
  );
});

export async function generateMetadata(props: {
  params: Promise<{ didOrHandle: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    let resolved = await idResolver.handle.resolve(didOrHandle);
    if (!resolved) return { title: "Profile - Leaflet" };
    did = resolved;
  }

  let profileData = await getCachedProfileData(did);
  let { profile } = profileData.result;

  if (!profile) return { title: "Profile - Leaflet" };

  const displayName = profile.displayName;
  const handle = profile.handle;

  const title = displayName
    ? `${displayName} (@${handle}) - Leaflet`
    : `@${handle} - Leaflet`;

  // The DID form is the one URL per profile (the page permanently redirects
  // handle spellings onto it).
  return { title, alternates: { canonical: `/p/${encodeURIComponent(did)}` } };
}

// Synchronous shell + suspended inner, same as the (identity) and
// (home-pages) layouts above: a fresh mount of this segment (e.g. home →
// /p/handle) suspends inside their already-committed boundaries, which won't
// re-show their fallback mid-transition — so this segment needs its own
// boundary to commit against while the handle/profile resolve.
export default function ProfilePageLayout(props: {
  params: Promise<{ didOrHandle: string }>;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <ProfilePageLayoutInner {...props} />
    </Suspense>
  );
}

async function ProfilePageLayoutInner(props: {
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
          <p className="font-bold">Sorry, we can&apos;t find that handle!</p>
          <p>
            This may be a glitch on our end. If the issue persists please{" "}
            <a href="mailto:contact@leaflet.pub">send us a note</a>.
          </p>
        </NotFoundLayout>
      );
    }
    did = resolved;
  }
  let profileData = await getCachedProfileData(did);
  let { publications, profile } = profileData.result;

  if (!profile) return null;

  let displayName = profile.displayName || profile.handle;

  return (
    <DashboardShell
      id="profile"
      pageTitle={<PageTitle pageTitle={displayName} />}
      tabs={{
        Inbox: { icon: <BlockMailboxSmall />, href: "/reader" },
        Trending: { icon: <TrendingSmall />, href: "/reader/trending" },
        New: { icon: <NewSmall />, href: "/reader/new" },
      }}
    >
      <DashboardPageLayout
        pageTitle={displayName}
        scrollKey="dashboard-profile-default"
        showHeader={false}
      >
        <ProfileLayout>
          <ProfileHeader profile={profile} publications={publications || []} />
          <ProfileTabs didOrHandle={params.didOrHandle} />
          <>{props.children}</>
        </ProfileLayout>
      </DashboardPageLayout>
    </DashboardShell>
  );
}

export type ProfileData = {
  did: string;
  handle: string | null;
  indexed_at: string;
  record: Json;
};
