"use client";

import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { useIdentityData } from "components/IdentityProvider";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { PublicationContent } from "../PublicationContent";

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

  let profile = profileRecord
    ? {
        did: profileRecord.did,
        displayName: profileRecord.displayName,
        handle: profileRecord.handle,
      }
    : undefined;

  if (!publication) return null;

  return (
    <PublicationContent
      record={record}
      publication={publication}
      did={did}
      profile={profile}
      showPageBackground={props.showPageBackground}
    />
  );
}
