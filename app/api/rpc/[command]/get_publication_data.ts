import { z } from "zod";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { AtUri } from "@atproto/syntax";
import { getFactsFromHomeLeaflets } from "./getFactsFromHomeLeaflets";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { ids } from "lexicons/api/lexicons";

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
    let { data: publication, error } = await supabase
      .from("publications")
      .select(
        `*,
        documents_in_publications(documents(
          *,
          comments_on_documents(count),
          document_mentions_in_bsky(count)
        )),
        publication_subscriptions(*, identities(bsky_profiles(*))),
        publication_domains(*),
        leaflets_in_publications(*,
          documents(*),
          permission_tokens(*,
            permission_token_rights(*),
            custom_domain_routes!custom_domain_routes_edit_permission_token_fkey(*)
         )
        )`,
      )
      .or(`name.eq."${publication_name}", uri.eq."${pubLeafletUri}", uri.eq."${siteStandardUri}"`)
      .eq("identity_did", did)
      .single();

    let leaflet_data = await getFactsFromHomeLeaflets.handler(
      {
        tokens:
          publication?.leaflets_in_publications.map(
            (l) => l.permission_tokens?.root_entity!,
          ) || [],
      },
      { supabase },
    );

    // Pre-normalize documents from documents_in_publications
    const documents = (publication?.documents_in_publications || [])
      .map((dip) => {
        if (!dip.documents) return null;
        const normalized = normalizeDocumentRecord(dip.documents.data, dip.documents.uri);
        if (!normalized) return null;
        return {
          uri: dip.documents.uri,
          record: normalized,
          indexed_at: dip.documents.indexed_at,
          data: dip.documents.data,
          commentsCount: dip.documents.comments_on_documents[0]?.count || 0,
          mentionsCount: dip.documents.document_mentions_in_bsky[0]?.count || 0,
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
        publication,
        documents,
        drafts,
        leaflet_data: leaflet_data.result,
      },
    };
  },
});
