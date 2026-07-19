"use client";

import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/(app)/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useIdentityData } from "components/IdentityProvider";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { DefaultPublicationHomepage } from "../DefaultPublicationHomepage";
import { buildPublicationPosts } from "../buildPublicationPosts";
import { LocalizedDate } from "../LocalizedDate";
import type { ReactNode } from "react";

export function PubPreview(props: {
  showPageBackground: boolean;
  pageWidth: number;
  homePagePreview?: ReactNode;
}) {
  let { data } = usePublicationData();
  let { publication } = data || {};
  let { identity } = useIdentityData();
  let record = useNormalizedPublicationRecord();

  // When the publication has a published custom home page, the server renders
  // it and passes it down here; show that instead of the default homepage.
  if (props.homePagePreview) return <>{props.homePagePreview}</>;

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

  const fakePosts = hasPosts
    ? undefined
    : [
        {
          title: "Your Personal Antheme",
          description:
            "Welcome to the Publication Theme Setter. This is how posts will appear in your publication",
          date: (
            <LocalizedDate
              dateString={today.toISOString()}
              options={dateOptions}
            />
          ),
        },
        {
          title: "The Theme of the Crop",
          description:
            "This is the place to make your publication look and feel like home. It looks great!",
          date: (
            <LocalizedDate
              dateString={yesterday.toISOString()}
              options={dateOptions}
            />
          ),
        },
        {
          title: "Reams and Reams of Colorful Themes!",
          description:
            "So happy to have you. There's so much cool stuff happening here, including this publication :)",
          date: (
            <LocalizedDate
              dateString={dayBefore.toISOString()}
              options={dateOptions}
            />
          ),
        },
      ];

  return (
    <DefaultPublicationHomepage
      record={record}
      publication={publication}
      did={did}
      profile={profile}
      showPageBackground={props.showPageBackground}
      fakePosts={fakePosts}
      posts={buildPublicationPosts(publication.documents_in_publications)}
    />
  );
}
