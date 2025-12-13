import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { getLinkPostsByUser, getUserProfile } from "actions/linkActions";
import { LinkPostCard } from "../../LinkPostCard";
import { getIdentityData } from "actions/getIdentityData";
import { LinkSubmitForm } from "../../LinkSubmitForm";

interface Props {
  params: Promise<{ did: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { did } = await params;
  const profile = await getUserProfile(did);
  const displayName = profile?.record?.displayName || profile?.handle || did.slice(0, 20);

  return {
    title: `${displayName}'s Links - Leaflet`,
    description: `Links shared by ${displayName}`,
  };
}

export default async function UserLinksPage({ params }: Props) {
  const { did } = await params;
  const [profile, postsResult, identity] = await Promise.all([
    getUserProfile(did),
    getLinkPostsByUser(did, 50),
    getIdentityData(),
  ]);

  const displayName = profile?.record?.displayName || profile?.handle || did.slice(0, 20);
  const handle = profile?.handle || did;
  const avatar = profile?.record?.avatar;
  const isOwnProfile = identity?.atp_did === did;

  return (
    <DashboardLayout
      id="links-user"
      cardBorderHidden={false}
      currentPage="links"
      defaultTab="feed"
      actions={identity ? <LinkSubmitForm /> : null}
      tabs={{
        feed: {
          controls: null,
          content: (
            <UserLinksContent
              did={did}
              displayName={displayName}
              handle={handle}
              avatar={avatar}
              posts={postsResult.posts}
              isOwnProfile={isOwnProfile}
            />
          ),
        },
      }}
    />
  );
}

interface UserLinksContentProps {
  did: string;
  displayName: string;
  handle: string;
  avatar?: { ref: { $link: string } };
  posts: any[];
  isOwnProfile: boolean;
}

function UserLinksContent({
  did,
  displayName,
  handle,
  avatar,
  posts,
  isOwnProfile,
}: UserLinksContentProps) {
  return (
    <div className="max-w-prose mx-auto w-full">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center pt-4 px-4 pb-6 border-b border-border mb-4">
        {avatar && (
          <img
            src={`https://cdn.bsky.app/img/avatar/plain/${did}/${avatar.ref.$link}@jpeg`}
            alt=""
            className="w-20 h-20 rounded-full mb-3"
          />
        )}
        <h1 className="text-xl font-semibold">{displayName}</h1>
        <p className="text-secondary">@{handle}</p>
        <p className="text-sm text-tertiary mt-2">
          {posts.length} {posts.length === 1 ? "link post" : "link posts"}
        </p>
        <Link
          href="/links"
          className="mt-3 text-sm text-accent-1 hover:underline"
        >
          ← Back to all links
        </Link>
      </div>

      {/* Posts */}
      <div className="flex flex-col gap-4 p-4">
        {posts.length === 0 ? (
          <div className="text-center text-secondary py-8">
            <p>{isOwnProfile ? "You haven't" : `${displayName} hasn't`} shared any links yet.</p>
            {isOwnProfile && (
              <p className="text-sm mt-2">Use the "Share Links" button to get started!</p>
            )}
          </div>
        ) : (
          posts.map((post) => <LinkPostCard key={post.uri} post={post} />)
        )}
      </div>
    </div>
  );
}
