"use server";

import { AtUri } from "@atproto/syntax";
import { AtpBaseClient } from "lexicons/api";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { getAuthIdentity } from "src/auth";
import { Err, Ok, Result } from "src/result";
import { deduplicateByUri } from "src/utils/deduplicateRecords";
import { isLeafletManagedPublication } from "src/utils/isLeafletManagedPublication";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { writeRecommendations } from "src/utils/writeRecommendations";
import { supabaseServerClient } from "supabase/serverClient";

export type ViewerOwnedPublication = {
  uri: string;
  name: string;
  icon: string | null;
  recommendations: string[];
};

// The viewer's own Leaflet publications (same set the dashboard identity
// exposes) with each one's current recommendation list, so a picker can show
// which already recommend a given publication. Fetched on demand because the
// slim viewer identity on published pages leaves `publications` empty.
export async function getViewerOwnedPublications(): Promise<
  ViewerOwnedPublication[]
> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return [];

  const { data: rows } = await supabaseServerClient
    .from("publications")
    .select(
      "uri, name, record, publication_recommendations(recommendation, sort_order)",
    )
    .eq("identity_did", identity.atp_did);

  return deduplicateByUri(rows ?? [])
    .filter(isLeafletManagedPublication)
    .map((p) => {
      const icon = normalizePublicationRecord(p.record)?.icon;
      return {
        uri: p.uri,
        name: p.name,
        icon: icon ? blobRefToSrc(icon.ref, new AtUri(p.uri).host) : null,
        recommendations: orderedRecommendations(p.publication_recommendations),
      };
    });
}

function orderedRecommendations(
  rows: { recommendation: string; sort_order: number }[],
) {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => r.recommendation);
}

export type RecommendPublicationError =
  | { type: "not_owner" | "invalid" }
  | OAuthSessionError;

// Appends `recommendation` to `publicationUri`'s recommendation list. A no-op
// (still ok) when it's already there.
export async function addPublicationRecommendation(args: {
  publicationUri: string;
  recommendation: string;
}): Promise<Result<{ recommendations: string[] }, RecommendPublicationError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did)
    return Err({
      type: "oauth_session_expired",
      message: "Not authenticated",
      did: "",
    });
  try {
    new AtUri(args.recommendation);
  } catch {
    return Err({ type: "invalid" });
  }
  if (args.recommendation === args.publicationUri)
    return Err({ type: "invalid" });

  const { data: pub } = await supabaseServerClient
    .from("publications")
    .select(
      "uri, identity_did, publication_recommendations(recommendation, sort_order)",
    )
    .eq("uri", args.publicationUri)
    .single();
  if (!pub || pub.identity_did !== identity.atp_did)
    return Err({ type: "not_owner" });

  const existing = orderedRecommendations(pub.publication_recommendations);
  if (existing.includes(args.recommendation))
    return Ok({ recommendations: existing });

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) return Err(sessionResult.error);
  const credentialSession = sessionResult.value;
  const agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  const recommendations = [...existing, args.recommendation];
  await writeRecommendations(agent, args.publicationUri, recommendations);
  return Ok({ recommendations });
}
