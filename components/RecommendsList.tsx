"use client";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { Avatar } from "./Avatar";
import { DotLoader } from "./utils/DotLoader";
import { ProfilePopover } from "./ProfilePopover";
import { useContributorProfiles } from "src/hooks/useContributorProfiles";

// Fetches the DIDs that recommended a document and hydrates them into basic
// profiles, showing a loader until ready. Shared by the RecommendsModal and the
// interaction drawer's recommends view. The fetch runs on mount, so callers
// only render this once the modal/drawer is actually opened.
export function RecommendsList(props: { documentUri: string }) {
  const { data: didsData, isLoading: didsLoading } = useSWR(
    `document-recommends:${props.documentUri}`,
    async () => {
      const res = await callRPC("get_document_recommends", {
        document: props.documentUri,
      });
      return res.result.dids;
    },
  );
  const dids = didsData ?? [];
  const { data: profiles, isLoading: profilesLoading } =
    useContributorProfiles(dids);

  const loading = didsLoading || (dids.length > 0 && profilesLoading);

  if (loading)
    return (
      <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
        <span>loading</span>
        <DotLoader />
      </div>
    );

  if (dids.length === 0)
    return (
      <div className="text-tertiary italic text-sm py-8 text-center">
        No recommends yet
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {dids.map((did) => {
        const profile = profiles?.[did];
        return (
          <ProfilePopover
            key={did}
            didOrHandle={profile?.handle ?? did}
            trigger={
              <div className="flex items-center gap-2 hover:underline">
                <Avatar
                  src={profile?.avatar}
                  displayName={profile?.displayName}
                  size="medium"
                />
                <div className="flex flex-col min-w-0 text-left">
                  <div className="text-primary font-bold truncate">
                    {profile?.displayName || profile?.handle || "Unknown user"}
                  </div>
                  {profile?.handle && (
                    <div className="text-tertiary text-sm truncate">
                      @{profile.handle}
                    </div>
                  )}
                </div>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
