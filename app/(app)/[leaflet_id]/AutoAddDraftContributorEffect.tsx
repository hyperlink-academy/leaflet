"use client";

import { useEffect, useRef } from "react";
import { mutate as swrMutate } from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { addSelfAsDraftContributor } from "actions/publications/draftContributors";

// When a confirmed publication contributor opens a draft they're not yet
// tracked on, silently register them as a draft contributor so the draft
// appears on their home dashboard. The server action is a no-op for
// non-contributors and for the publication owner.
export function AutoAddDraftContributorEffect(props: { leaflet_id: string }) {
  let { identity, mutate } = useIdentityData();
  let ran = useRef<string | null>(null);

  useEffect(() => {
    if (!identity?.atp_did) return;
    if (ran.current === props.leaflet_id) return;

    let alreadyTracked = (identity.contributor_leaflets ?? []).some(
      (row) => row.permission_tokens.id === props.leaflet_id,
    );
    let alreadyOwnedOnHome = identity.permission_token_on_homepage.some(
      (ptoh) => ptoh.permission_tokens.id === props.leaflet_id,
    );
    if (alreadyTracked || alreadyOwnedOnHome) return;

    ran.current = props.leaflet_id;
    addSelfAsDraftContributor(props.leaflet_id).then((res) => {
      if (res.ok) {
        mutate();
        swrMutate("leaflets");
      }
    });
  }, [identity, props.leaflet_id, mutate]);

  return null;
}
