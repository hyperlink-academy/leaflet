import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { AtUri } from "@atproto/syntax";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { getIdentityData } from "actions/getIdentityData";
import { ids } from "lexicons/api/lexicons";
import { publicationUriVariants } from "src/utils/uriHelpers";
import { dedupeDocumentsInPublications } from "src/utils/deduplicateRecords";

export type GetPublicationDataReturnType = Awaited<
  ReturnType<(typeof get_publication_data)["handler"]>
>;
export const get_publication_data = makeRoute({
  route: "get_publication_data",
  input: z.object({
    did: z.string(),
    publication_name: z.string(),
  }),
  handler: async (
    { did, publication_name },
    { supabase }: Pick<Env, "supabase">,
  ) => {
    let pubLeafletUri;
    let siteStandardUri;
    if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
      pubLeafletUri = AtUri.make(
        did,
        ids.PubLeafletPublication,
        publication_name,
      ).toString();
      siteStandardUri = AtUri.make(
        did,
        ids.SiteStandardPublication,
        publication_name,
      ).toString();
    }
    let [identity, { data: publication }] = await Promise.all([
      getIdentityData(),
      supabase
        .from("publications")
        .select(
          `*,
        publication_subscriptions(*, identities(atp_did)),
        publication_email_subscribers(*, identities(atp_did)),
        publication_domains(*),
        publication_newsletter_settings(enabled, reply_to_email, reply_to_verified_at),
        publication_membership_settings(enabled),
        publication_membership_tiers(id, name, description, monthly_price_cents, annual_price_cents, currency, active, sort_order),
        leaflets_in_publications(*,
          documents(*),
          permission_tokens(*,
            permission_token_rights(*),
            custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*),
            leaflet_contributors(contributor_did, created_at)
         )
        ),
        publication_contributors(contributor_did, confirmed, created_at),
        publication_pages(*)`,
        )
        .or(
          `name.eq."${publication_name}", uri.eq."${pubLeafletUri}", uri.eq."${siteStandardUri}"`,
        )
        .eq("identity_did", did)
        .order("uri", { ascending: false })
        .limit(1)
        .single(),
    ]);

    // This data is for the publication dashboard only — it includes subscriber
    // emails and draft permission tokens — so it's gated to the owner and
    // confirmed contributors. Everyone else gets the same shape as a
    // nonexistent publication.
    const viewerDid = identity?.atp_did;
    const canAccess =
      !!publication &&
      !!viewerDid &&
      (publication.identity_did === viewerDid ||
        publication.publication_contributors.some(
          (c) => c.contributor_did === viewerDid && c.confirmed,
        ));
    if (!canAccess) {
      return { result: { publication: null, documents: [], drafts: [] } };
    }

    // Documents link to whichever namespace URI their record names, and the
    // publication may be indexed under both — fetch links for both variants so
    // legacy pub.leaflet-only posts still show up alongside migrated ones.
    const { data: docLinks } = await supabase
      .from("documents_in_publications")
      .select(
        `members_only, documents(
          *,
          comments_on_documents(count),
          document_mentions_in_bsky(count),
          recommends_on_documents(count),
          publication_post_sends(status, subscriber_count)
        )`,
      )
      .in("publication", publicationUriVariants(publication.uri));
    const documentsInPublication = dedupeDocumentsInPublications(
      docLinks ?? [],
    );

    // Pre-normalize documents from documents_in_publications
    const documents = documentsInPublication
      .map((dip) => {
        if (!dip.documents) return null;
        const normalized = normalizeDocumentRecord(
          dip.documents.data,
          dip.documents.uri,
        );
        if (!normalized) return null;
        return {
          uri: dip.documents.uri,
          record: normalized,
          membersOnly: dip.members_only,
          indexed_at: dip.documents.indexed_at,
          sort_date: dip.documents.sort_date,
          data: dip.documents.data,
          bsky_like_count: dip.documents.bsky_like_count,
          commentsCount: dip.documents.comments_on_documents[0]?.count || 0,
          mentionsCount: dip.documents.document_mentions_in_bsky[0]?.count || 0,
          recommendsCount:
            dip.documents.recommends_on_documents?.[0]?.count || 0,
          postSend: dip.documents.publication_post_sends?.[0] || null,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    // Pre-filter drafts (leaflets without published documents, not archived)
    const drafts = (publication?.leaflets_in_publications || [])
      .filter((l) => !l.documents)
      .filter((l) => !(l as { archived?: boolean }).archived)
      .map((l) => ({
        leaflet: l.leaflet,
        title: l.title,
        permission_tokens: l.permission_tokens,
        // Keep the full leaflet data for LeafletList compatibility
        _raw: l,
      }));

    return {
      result: {
        // Reattach the merged document links; clients (e.g. the theme preview)
        // read publication.documents_in_publications off this object.
        publication: {
          ...publication,
          documents_in_publications: documentsInPublication,
        },
        documents,
        drafts,
      },
    };
  },
});
