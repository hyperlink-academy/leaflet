import { generateKeyBetween } from "fractional-indexing";
import { supabaseServerClient } from "supabase/serverClient";
import { appendToLeaflet, type LeafletFact } from "src/utils/insertLeaflet";
import { publishPublicationPages } from "src/utils/publishPublicationPages";
import { readNavEntries } from "src/utils/publicationNavEntries";
import { createPublicationDraftLeaflet } from "actions/createPublicationDraftLeaflet";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

// Append a page to the end of the publication's nav in its draft leaflet
// (creating the draft leaflet if the publication has none). The page's facts
// must already include its publicationPageFacts (src/import/leaflet).
export async function appendPublicationPage(args: {
  publication: {
    uri: string;
    identity_did: string;
    record: unknown;
    draft_leaflet: string | null;
  };
  route: string;
  page: { pageId: string; entities: string[]; facts: LeafletFact[] };
}) {
  let { publication: pub, route, page } = args;
  let pubRecord = normalizePublicationRecord(pub.record);
  let draftLeaflet =
    pub.draft_leaflet ??
    (await createPublicationDraftLeaflet({
      publication_uri: pub.uri,
      did: pub.identity_did,
      description: pubRecord?.description,
      theme: resolvePublicationTheme(pubRecord),
    }));
  let [{ data: token }, { data: rights }] = await Promise.all([
    supabaseServerClient
      .from("permission_tokens")
      .select("root_entity")
      .eq("id", draftLeaflet)
      .single()
      .throwOnError(),
    supabaseServerClient
      .from("permission_token_rights")
      .select("entity_set")
      .eq("token", draftLeaflet)
      .eq("write", true)
      .throwOnError(),
  ]);
  let entitySet = rights?.[0]?.entity_set;
  if (!token || !entitySet)
    throw new Error("Draft leaflet has no writable set");
  let rootEntity = token.root_entity;
  let { data: factData } = await supabaseServerClient
    .rpc("get_facts", { root: rootEntity })
    .throwOnError();
  let nav = readNavEntries(
    (factData as unknown as Fact<Attribute>[]) ?? [],
    rootEntity,
  );
  let clash = nav.find((e) => e.route === route);
  if (clash)
    throw new Error(
      `The publication already has a page at ${route} ("${clash.title}")`,
    );

  await appendToLeaflet({
    entitySetId: entitySet,
    entityIds: page.entities,
    facts: [
      {
        entity: rootEntity,
        attribute: "root/page",
        data: {
          type: "ordered-reference",
          value: page.pageId,
          position: generateKeyBetween(nav.at(-1)?.position ?? null, null),
        },
      },
      ...page.facts,
    ],
  });
}

// Publish the publication's draft pages as the owner. This publishes the
// whole draft — imported pages along with any unpublished edits the owner
// had pending.
export async function publishImportedPages(
  publicationUri: string,
): Promise<{ published: number }> {
  let { data: pub } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .eq("uri", publicationUri)
    .maybeSingle()
    .throwOnError();
  if (!pub) throw new Error("Publication not found");
  let result = await publishPublicationPages({
    publication_uri: publicationUri,
    actorDid: pub.identity_did,
  });
  if (!result.success) throw new Error(result.error.message);
  return { published: result.published.length };
}
