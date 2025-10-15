"use server";

import { AtpAgent } from "@atproto/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getIdentityData } from "actions/getIdentityData";
import { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";
import { idResolver } from "./idResolver";

export async function getSubscriptions(cursor?: string | null): Promise<{
  nextCursor: null | string;
  subscriptions: PublicationSubscription[];
}> {
  let auth_res = await getIdentityData();
  if (!auth_res?.atp_did) return { subscriptions: [], nextCursor: null };
  let query = supabaseServerClient
    .from("publication_subscriptions")
    .select(`publications(*, documents_in_publications(*, documents(*)))`)
    .order(`created_at`, { ascending: false })
    .order("indexed_at", {
      referencedTable: "publications.documents_in_publications",
    })
    .limit(1, { referencedTable: "publications.documents_in_publications" })
    .limit(25)
    .eq("identity", auth_res.atp_did);

  if (cursor) query.lt("indexed_at", cursor);
  let { data: pubs, error } = await query;

  const actors: string[] = [
    ...new Set(
      pubs?.map((pub) => pub.publications?.identity_did!).filter(Boolean) || [],
    ),
  ];
  const hydratedSubscriptions: PublicationSubscription[] = await Promise.all(
    pubs?.map(async (pub) => {
      let id = await idResolver.did.resolve(pub.publications?.identity_did!);
      return {
        ...pub.publications!,
        authorProfile: id?.alsoKnownAs?.[0]
          ? { handle: id.alsoKnownAs[0] }
          : undefined,
      };
    }) || [],
  );

  const nextCursor =
    pubs && pubs.length > 0
      ? pubs[pubs.length - 1].publications?.documents_in_publications?.[0]
          ?.indexed_at || null
      : null;

  return {
    subscriptions: hydratedSubscriptions,
    nextCursor,
  };
}

export type PublicationSubscription = {
  authorProfile?: { handle: string };
  record: Json;
  uri: string;
  documents_in_publications: {
    documents: { data?: Json; indexed_at: string } | null;
  }[];
};
