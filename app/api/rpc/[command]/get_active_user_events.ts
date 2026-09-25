import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { getAuthIdentity } from "src/auth";
import { isAdminEmail } from "src/adminAllowlist";
import { ACTIVITY_METRICS, tinybird, type ActivityMetric } from "lib/tinybird";
import { getProfiles } from "src/identity";
import { getDocumentURL, getPublicationURL } from "src/utils/getPublicationURL";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";

export type GetActiveUserEventsReturnType = Awaited<
  ReturnType<(typeof get_active_user_events)["handler"]>
>;

export type ActiveUserEventRow = {
  timestamp: number;
  event: string;
  properties: Record<string, string>;
  user: {
    id: string;
    email: string | null;
    did: string | null;
    handle: string | null;
    displayName: string | null;
  };
  // Resolved from the `publication` / `source_publication` / `document`
  // properties; null when the property is set but the row no longer exists.
  publication: PublicationLink | null;
  sourcePublication: PublicationLink | null;
  document: DocumentLink | null;
};
type PublicationLink = { uri: string; name: string; url: string };
type DocumentLink = { uri: string; title: string; url: string };

const PAGE_SIZE = 50;

export const get_active_user_events = makeRoute({
  route: "get_active_user_events",
  input: z.object({
    metric: z.enum(
      Object.keys(ACTIVITY_METRICS) as [ActivityMetric, ...ActivityMetric[]],
    ),
    from: z.string(),
    to: z.string().optional(),
    before: z.number().optional(),
  }),
  handler: async (
    { metric, from, to, before },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    const identity = await getAuthIdentity();
    if (!isAdminEmail(identity?.email)) {
      return { error: "unauthorized" as const };
    }

    let filter = ACTIVITY_METRICS[metric];
    let { data: rows } = await tinybird.userEventsList.query({
      event: filter.event,
      date_from: from,
      ...(to ? { date_to: to } : {}),
      ...("where" in filter
        ? { property_key: filter.where[0], property_value: filter.where[1] }
        : {}),
      ...(before ? { before } : {}),
      limit: PAGE_SIZE,
    });

    let parsed = rows.map((r) => ({
      ...r,
      timestamp: Number(r.timestamp),
      properties: parseProperties(r.properties_json),
    }));

    let identityIds = unique(parsed.map((r) => r.identity_id));
    let publicationUris = unique(
      parsed.flatMap((r) => [
        r.properties.publication,
        r.properties.source_publication,
      ]),
    );
    let documentUris = unique(parsed.map((r) => r.properties.document));

    let [identities, publications, documents] = await Promise.all([
      identityIds.length
        ? supabase
            .from("identities")
            .select("id, email, atp_did")
            .in("id", identityIds)
            .then((r) => r.data ?? [])
        : [],
      publicationUris.length
        ? supabase
            .from("publications")
            .select("uri, name, record")
            .in("uri", publicationUris)
            .then((r) => r.data ?? [])
        : [],
      documentUris.length
        ? supabase
            .from("documents")
            .select(
              "uri, data, documents_in_publications(publications(uri, record))",
            )
            .in("uri", documentUris)
            .then((r) => r.data ?? [])
        : [],
    ]);

    let identityById = new Map(identities.map((i) => [i.id, i]));
    // The event's own DID is the fallback for identities that were deleted.
    let dids = unique(
      parsed.map((r) => identityById.get(r.identity_id)?.atp_did || r.did),
    );
    let profiles = await getProfiles(dids);

    let publicationByUri = new Map<string, PublicationLink>(
      publications.map((p) => [
        p.uri,
        { uri: p.uri, name: p.name, url: getPublicationURL(p) },
      ]),
    );
    let documentByUri = new Map<string, DocumentLink>();
    for (let d of documents) {
      let normalized = normalizeDocumentRecord(d.data, d.uri);
      if (!normalized) continue;
      let pub = d.documents_in_publications[0]?.publications ?? null;
      documentByUri.set(d.uri, {
        uri: d.uri,
        title: normalized.title || "Untitled",
        url: getDocumentURL(normalized, d.uri, pub),
      });
    }

    let link = <T>(map: Map<string, T>, uri: string | undefined) =>
      uri ? map.get(uri) ?? null : null;

    let events: ActiveUserEventRow[] = parsed.map((r) => {
      let row = identityById.get(r.identity_id);
      let did = row?.atp_did || r.did || null;
      let profile = did ? profiles.get(did) : undefined;
      return {
        timestamp: r.timestamp,
        event: r.event,
        properties: r.properties,
        user: {
          id: r.identity_id,
          email: row?.email ?? null,
          did,
          handle: profile?.handle ?? null,
          displayName: profile?.displayName ?? null,
        },
        publication: link(publicationByUri, r.properties.publication),
        sourcePublication: link(
          publicationByUri,
          r.properties.source_publication,
        ),
        document: link(documentByUri, r.properties.document),
      };
    });

    return {
      result: {
        events,
        nextBefore:
          events.length === PAGE_SIZE
            ? events[events.length - 1].timestamp
            : null,
      },
    };
  },
});

function parseProperties(json: string): Record<string, string> {
  try {
    let value = JSON.parse(json);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function unique(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((v): v is string => !!v))];
}
