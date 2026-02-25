"use server";

import { AtpAgent } from "@atproto/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getIdentityData } from "actions/getIdentityData";
import { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";
import { idResolver } from "./idResolver";
import { Cursor } from "./getReaderFeed";
import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

export async function getSubscriptions(
  did?: string | null,
  cursor?: Cursor | null,
): Promise<{
  nextCursor: null | Cursor;
  subscriptions: PublicationSubscription[];
}> {
  // If no DID provided, use logged-in user's DID
  let identity = did;
  if (!identity) {
    const auth_res = await getIdentityData();
    if (!auth_res?.atp_did) return { subscriptions: [], nextCursor: null };
    identity = auth_res.atp_did;
  }

  let query = supabaseServerClient
    .from("publication_subscriptions")
    .select(
      `*, publications(*, publication_subscriptions(*), documents_in_publications(*, documents(*)))`,
    )
    .order(`created_at`, { ascending: false })
    .order(`uri`, { ascending: false })
    .order("documents(sort_date)", {
      ascending: false,
      referencedTable: "publications.documents_in_publications",
    })
    .limit(1, { referencedTable: "publications.documents_in_publications" })
    .limit(25)
    .eq("identity", identity);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.timestamp},and(created_at.eq.${cursor.timestamp},uri.lt.${cursor.uri})`,
    );
  }
  let { data: pubs, error } = await query;

  const hydratedSubscriptions = (
    await Promise.all(
      pubs?.map(async (pub) => {
        const normalizedRecord = normalizePublicationRecord(
          pub.publications?.record,
        );
        if (!normalizedRecord) return null;
        let id = await idResolver.did.resolve(pub.publications?.identity_did!);
        return {
          ...pub.publications!,
          record: normalizedRecord,
          authorProfile: id?.alsoKnownAs?.[0]
            ? { handle: `@${id.alsoKnownAs[0].slice(5)}` }
            : undefined,
        } as PublicationSubscription;
      }) || [],
    )
  ).filter((sub): sub is PublicationSubscription => sub !== null);
  const nextCursor =
    pubs && pubs.length > 0
      ? {
          timestamp: pubs[pubs.length - 1].created_at,
          uri: pubs[pubs.length - 1].uri,
        }
      : null;

  return {
    subscriptions: hydratedSubscriptions,
    nextCursor,
  };
}

export type PublicationSubscription = {
  authorProfile?: { handle: string };
  record: NormalizedPublication;
  publication_subscriptions: { identity: string }[];
  uri: string;
  documents_in_publications: {
    documents: { data?: Json; sort_date: string } | null;
  }[];
};
