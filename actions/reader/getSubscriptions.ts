"use server";

import { AtpAgent } from "@atproto/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getAuthIdentity } from "src/auth";
import { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";
import { idResolver } from "src/identity";
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
    const auth_res = await getAuthIdentity();
    if (!auth_res?.atp_did) return { subscriptions: [], nextCursor: null };
    identity = auth_res.atp_did;
  }

  let query = supabaseServerClient
    .from("publication_subscriptions")
    .select(
      `*, publications(*, publication_subscriptions(*), publication_newsletter_settings(enabled), documents_in_publications(*, documents(*)))`,
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
      pubs?.map((pub) => hydratePublication(pub.publications)) || [],
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

// Full listing data for specific publications, in the same shape as
// getSubscriptions — used to pin paid memberships regardless of where they
// fall in the paginated subscription list.
export async function getPublicationsByUris(
  uris: string[],
): Promise<PublicationSubscription[]> {
  if (uris.length === 0) return [];
  let { data: pubs } = await supabaseServerClient
    .from("publications")
    .select(
      `*, publication_subscriptions(*), publication_newsletter_settings(enabled), documents_in_publications(*, documents(*))`,
    )
    .in("uri", uris)
    .order("documents(sort_date)", {
      ascending: false,
      referencedTable: "documents_in_publications",
    })
    .limit(1, { referencedTable: "documents_in_publications" });

  return (await Promise.all((pubs ?? []).map(hydratePublication))).filter(
    (pub): pub is PublicationSubscription => pub !== null,
  );
}

async function hydratePublication<
  T extends { record: Json | null; identity_did: string | null },
>(pub: T | null): Promise<PublicationSubscription | null> {
  if (!pub) return null;
  const normalizedRecord = normalizePublicationRecord(pub.record);
  if (!normalizedRecord) return null;
  let id = await idResolver.did.resolve(pub.identity_did!);
  return {
    ...pub,
    record: normalizedRecord,
    authorProfile: id?.alsoKnownAs?.[0]
      ? { handle: `@${id.alsoKnownAs[0].slice(5)}` }
      : undefined,
  } as unknown as PublicationSubscription;
}

export type PublicationSubscription = {
  authorProfile?: { handle: string };
  record: NormalizedPublication;
  publication_subscriptions: { identity: string }[];
  publication_newsletter_settings: { enabled: boolean } | null;
  uri: string;
  documents_in_publications: {
    documents: { data?: Json; sort_date: string } | null;
  }[];
};
