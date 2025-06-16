"use client";
import { AppBskyActorProfile } from "lexicons/api";
import { usePublicationData } from "./PublicationSWRProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

export function PublicationSubscribers() {
  let { data: publication } = usePublicationData();
  if (!publication) return <div>null</div>;
  if (publication.publication_subscriptions.length === 0)
    return <div>No subscribers yet!</div>;
  return (
    <div>
      <h2>{publication.publication_subscriptions.length} Subscribers </h2>
      <div className="flex gap-2 flex-col">
        {publication.publication_subscriptions
          .sort((a, b) => {
            return b.created_at.localeCompare(a.created_at);
          })
          .map((subscriber, index) => {
            if (!subscriber.identities?.bsky_profiles) return null;
            let handle = subscriber.identities?.bsky_profiles.handle;
            let profile = subscriber.identities?.bsky_profiles
              ?.record as AppBskyActorProfile.Record | null;
            if (!profile) return null;
            return (
              <div key={subscriber.identities.bsky_profiles?.did}>
                <a
                  target="_blank"
                  href={`https://bsky.app/profile/${subscriber.identities.bsky_profiles?.did}`}
                  className="flex text-primary p-2 gap-1"
                >
                  <div className="flex flex-row gap-2">
                    {profile.avatar && (
                      <img
                        className="rounded-full w-8 h-8"
                        src={
                          profile?.avatar &&
                          blobRefToSrc(
                            profile.avatar.ref,
                            subscriber.identities.bsky_profiles?.did,
                          )
                        }
                        alt={profile.displayName}
                      />
                    )}
                    <div className="flex flex-col gap-1">
                      <h3>{profile.displayName}</h3>
                      <p>@{handle}</p>
                    </div>
                  </div>
                </a>
                {index !== publication.publication_subscriptions.length - 1 && (
                  <hr className="border-border" />
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
