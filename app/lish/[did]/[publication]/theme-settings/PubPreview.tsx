"use client";

import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useIdentityData } from "components/IdentityProvider";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { PublicationContent } from "../PublicationContent";
import { LocalizedDate } from "../LocalizedDate";

export function PubPreview(props: {
  showPageBackground: boolean;
  pageWidth: number;
}) {
  let { data } = usePublicationData();
  let { publication } = data || {};
  let { identity } = useIdentityData();
  let record = useNormalizedPublicationRecord();

  let profileRecord = identity?.bsky_profiles
    ?.record as unknown as ProfileViewDetailed;

  let did = publication?.identity_did || "";

  let profile = identity?.bsky_profiles
    ? {
        did: identity.bsky_profiles.did,
        displayName: profileRecord?.displayName,
        handle: identity.bsky_profiles.handle || "",
      }
    : undefined;

  if (!publication) return null;

  const hasPosts = publication.documents_in_publications.some(
    (d) => !!d?.documents,
  );
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBefore = new Date(today);
  dayBefore.setDate(today.getDate() - 2);

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "2-digit",
  };

  const fakePosts = !hasPosts
    ? undefined
    : [
        {
          title: "Hello!",
          description:
            "So excited to have you! This is how your posts will appear in your publication",
          date: (
            <LocalizedDate
              dateString={today.toISOString()}
              options={dateOptions}
            />
          ),
        },
        {
          title: "Welcome to your Leaflet Publication",
          description:
            "Leaflet is an open platform for writing and reading long form posts. Everything you write here, and everyone that follows you is data that belongs to YOU.",
          date: (
            <LocalizedDate
              dateString={yesterday.toISOString()}
              options={dateOptions}
            />
          ),
        },
        {
          title: "I can't wait to see what you do here :)",
          description:
            "There's so much cool stuff happening here, including this publication!",
          date: (
            <LocalizedDate
              dateString={dayBefore.toISOString()}
              options={dateOptions}
            />
          ),
        },
      ];

  return (
    <PublicationContent
      record={record}
      publication={publication}
      did={did}
      profile={profile}
      showPageBackground={props.showPageBackground}
      fakePosts={fakePosts}
    />
  );
}
