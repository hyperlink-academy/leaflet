import { TID } from "@atproto/common";
import type { BlobRef } from "@atproto/lexicon";
import { supabaseServerClient } from "supabase/serverClient";
import type { Json } from "supabase/database.types";
import { inngest } from "app/api/inngest/client";
import { ids } from "lexicons/api/lexicons";
import type { SiteStandardDocument } from "lexicons/api";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndexLocal } from "src/replicache/utils";
import {
  processBlocksToPages,
  type ProcessBlocksToPagesHooks,
} from "src/utils/factsToPagesRecord";
import { leafletToPublicationPageRecord } from "src/utils/leafletToPublicationPageRecord";
import { readNavEntries } from "src/utils/publicationNavEntries";
import type { JsonBlob } from "src/utils/resolveBlobLinks";

// Publishing without the owner's session: records are built here with their
// images referenced by storage URL, linked in our tables right away (so the
// site renders them), and handed to the write-records-to-pds job, which
// uploads the blobs and writes the records as the owner.

export type PdsRecord = { collection: string; rkey: string; record: unknown };

const linkBlob = (src: string): JsonBlob => ({
  $type: "blob",
  ref: { $link: src },
  mimeType: "image/*",
  size: 0,
});
const linkHooks: ProcessBlocksToPagesHooks = {
  uploadImage: async (src) => linkBlob(src) as unknown as BlobRef,
  uploadPoll: null,
};

async function getFacts(rootEntity: string) {
  const { data } = await supabaseServerClient
    .rpc("get_facts", { root: rootEntity })
    .throwOnError();
  return (data as unknown as Fact<Attribute>[]) ?? [];
}

export async function buildDocumentRecord(args: {
  did: string;
  publicationUri: string;
  rootEntity: string;
  title: string;
  tags: string[];
  publishedAt: string;
  showInDiscover: boolean;
}): Promise<PdsRecord & { uri: string }> {
  const facts = await getFacts(args.rootEntity);
  const { pages } = await processBlocksToPages({
    facts,
    root_entity: args.rootEntity,
    hooks: linkHooks,
  });
  const scan = scanIndexLocal(facts);
  const coverRef = scan.eav(args.rootEntity, "root/cover-image")[0];
  const [cover] = coverRef ? scan.eav(coverRef.data.value, "block/image") : [];
  const rkey = TID.nextStr();
  const record = {
    $type: "site.standard.document",
    title: args.title,
    site: args.publicationUri,
    path: "/" + rkey,
    publishedAt: args.publishedAt,
    description: "",
    tags: args.tags,
    ...(cover && { coverImage: linkBlob(cover.data.src) }),
    contributors: [{ did: args.did }],
    ...(!args.showInDiscover && {
      preferences: {
        $type: "pub.leaflet.publication#preferences",
        showInDiscover: false,
      },
    }),
    content: {
      $type: "pub.leaflet.content",
      pages: pages.map((p) => ({
        $type:
          p.type === "canvas"
            ? "pub.leaflet.pages.canvas"
            : "pub.leaflet.pages.linearDocument",
        id: p.id,
        blocks: p.blocks,
      })),
    },
  } as unknown as SiteStandardDocument.Record;
  return {
    collection: ids.SiteStandardDocument,
    rkey,
    record,
    uri: `at://${args.did}/${ids.SiteStandardDocument}/${rkey}`,
  };
}

// The rows a publish writes for a publication post.
export async function linkDocument(args: {
  did: string;
  publicationUri: string;
  leafletId: string;
  uri: string;
  record: unknown;
  title: string;
  tags: string[];
}) {
  await supabaseServerClient
    .from("documents")
    .upsert({ uri: args.uri, data: args.record as Json, indexed: true })
    .throwOnError();
  await Promise.all([
    supabaseServerClient
      .from("documents_in_publications")
      .upsert({
        publication: args.publicationUri,
        document: args.uri,
        members_only: false,
      })
      .throwOnError(),
    supabaseServerClient
      .from("leaflets_in_publications")
      .update({ doc: args.uri, title: args.title, tags: args.tags })
      .eq("leaflet", args.leafletId)
      .throwOnError(),
    supabaseServerClient
      .from("leaflet_contributors")
      .upsert(
        { leaflet: args.leafletId, contributor_did: args.did },
        { onConflict: "leaflet,contributor_did", ignoreDuplicates: true },
      )
      .throwOnError(),
  ]);
}

// The publication's draft pages as page records, each linked in
// publication_pages under a fresh record uri (or the one it already has).
export async function buildAndLinkPageRecords(pub: {
  uri: string;
  identity_did: string;
  draft_leaflet: string | null;
}): Promise<PdsRecord[]> {
  if (!pub.draft_leaflet) throw new Error("The publication has no draft");
  const { data: token } = await supabaseServerClient
    .from("permission_tokens")
    .select("root_entity")
    .eq("id", pub.draft_leaflet)
    .single()
    .throwOnError();
  const rootEntity = token!.root_entity;
  const facts = await getFacts(rootEntity);
  const { data: existing } = await supabaseServerClient
    .from("publication_pages")
    .select("page_entity, record_uri")
    .eq("publication", pub.uri)
    .throwOnError();
  const out: PdsRecord[] = [];
  for (const page of readNavEntries(facts, rootEntity)) {
    if (page.externalUrl || !page.route) continue;
    const record = await leafletToPublicationPageRecord({
      facts,
      root_entity: rootEntity,
      start_page: page.entity,
      publication_uri: pub.uri,
      path: page.route,
      title: page.title,
      hooks: linkHooks,
    });
    const prior = existing?.find((r) => r.page_entity === page.entity);
    const rkey = prior?.record_uri
      ? prior.record_uri.split("/").pop()!
      : TID.nextStr();
    const uri = `at://${pub.identity_did}/${ids.PubLeafletPublicationPage}/${rkey}`;
    await supabaseServerClient
      .from("publication_pages")
      .upsert(
        {
          publication: pub.uri,
          page_entity: page.entity,
          path: page.route,
          title: page.title,
          sort_order: page.position,
          record: record as unknown as Json,
          record_uri: uri,
        },
        { onConflict: "publication,page_entity" },
      )
      .throwOnError();
    out.push({ collection: ids.PubLeafletPublicationPage, rkey, record });
  }
  return out;
}

// Inngest caps event payloads, and a comic page's record is a few KB.
const EVENT_BATCH = 25;

export async function sendRecordsToPds(did: string, records: PdsRecord[]) {
  for (let i = 0; i < records.length; i += EVENT_BATCH)
    await inngest.send({
      name: "user/write-records-to-pds",
      data: { did, records: records.slice(i, i + EVENT_BATCH) },
    });
}
