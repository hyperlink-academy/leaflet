import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminIdentity } from "src/adminAllowlist";
import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import type { Json } from "supabase/database.types";
import {
  AdminPublicationQueue,
  type QueuedPublication,
  type SpamPublication,
  type ClearedPublication,
} from "./AdminPublicationQueue";

export const metadata = {
  title: "Publication Review Queue",
};

const QUEUE_PAGE_SIZE = 200;

function describe(pub: { uri: string; record: Json | null }) {
  return {
    url: getPublicationURL(pub),
    description: normalizePublicationRecord(pub.record)?.description ?? null,
  };
}

export default async function PublicationQueuePage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminIdentity(identity?.id)) notFound();

  let [{ data: queue, error }, { data: spam }, { data: cleared }] =
    await Promise.all([
      supabaseServerClient
        .from("publication_reviews")
        .select(
          `queued_at, classifier_verdict, classifier_category, classifier_reason,
        publications(uri, name, record, identity_did,
          documents_in_publications(count),
          recent_posts:documents_in_publications(documents(title:data->>title)))`,
        )
        .is("reviewed_at", null)
        .order("queued_at", { ascending: false })
        .limit(QUEUE_PAGE_SIZE)
        .order("indexed_at", {
          referencedTable: "publications.recent_posts",
          ascending: false,
        })
        .limit(3, { referencedTable: "publications.recent_posts" }),
      supabaseServerClient
        .from("publication_reviews")
        .select(
          "queued_at, reviewed_at, reviewed_by, classifier_reason, publications(uri, name, record, identity_did)",
        )
        .eq("spam", true)
        .order("reviewed_at", { ascending: false })
        .limit(100),
      // Cleared by the review job with no person involved, for spot checks.
      supabaseServerClient
        .from("publication_reviews")
        .select(
          "queued_at, reviewed_at, classifier_reason, publications(uri, name, record, identity_did)",
        )
        .eq("spam", false)
        .is("reviewed_by", null)
        .not("reviewed_at", "is", null)
        .order("reviewed_at", { ascending: false })
        .limit(50),
    ]);
  if (error) throw new Error(error.message);

  let profiles = await getProfiles([
    ...new Set(
      [...(queue ?? []), ...(spam ?? []), ...(cleared ?? [])].flatMap(
        (r) => r.publications?.identity_did ?? [],
      ),
    ),
  ]);

  let queued: QueuedPublication[] = (queue ?? []).flatMap((r) => {
    let p = r.publications;
    if (!p) return [];
    return {
      uri: p.uri,
      name: p.name,
      ...describe(p),
      did: p.identity_did,
      handle: profiles.get(p.identity_did)?.handle ?? null,
      createdAt: r.queued_at,
      postCount: p.documents_in_publications[0]?.count ?? 0,
      recentPostTitles: p.recent_posts.flatMap((d) => d.documents?.title || []),
      verdict: r.classifier_verdict,
      verdictCategory: r.classifier_category,
      verdictReason: r.classifier_reason,
    };
  });

  let flagged: SpamPublication[] = (spam ?? []).flatMap((r) => {
    let p = r.publications;
    if (!p) return [];
    return {
      uri: p.uri,
      name: p.name,
      ...describe(p),
      did: p.identity_did,
      handle: profiles.get(p.identity_did)?.handle ?? null,
      createdAt: r.queued_at,
      flaggedAt: r.reviewed_at ?? r.queued_at,
      automated: !r.reviewed_by,
      verdictReason: r.classifier_reason,
    };
  });

  let autoCleared: ClearedPublication[] = (cleared ?? []).flatMap((r) => {
    let p = r.publications;
    if (!p) return [];
    return {
      uri: p.uri,
      name: p.name,
      ...describe(p),
      did: p.identity_did,
      handle: profiles.get(p.identity_did)?.handle ?? null,
      createdAt: r.queued_at,
      clearedAt: r.reviewed_at ?? r.queued_at,
      verdictReason: r.classifier_reason,
    };
  });

  return (
    <AdminPublicationQueue
      queue={queued}
      queueFull={queued.length === QUEUE_PAGE_SIZE}
      spam={flagged}
      cleared={autoCleared}
    />
  );
}
