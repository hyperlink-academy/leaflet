"use server";

import { revalidatePath } from "next/cache";
import { TID } from "@atproto/common";
import { AtUri } from "@atproto/syntax";
import { AtpBaseClient } from "lexicons/api";
import { leafletThemeToBasicTheme } from "lexicons/src/normalize";
import { Json } from "supabase/database.types";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { readNavEntries } from "src/utils/publicationNavEntries";
import { OAuthSessionError, restoreOAuthSession } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { leafletToPublicationPageRecord } from "src/utils/leafletToPublicationPageRecord";
import {
  extractThemeFromFacts,
  makePublishUploadHooks,
} from "src/utils/publishHelpers";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { getPublicationType } from "src/utils/collectionHelpers";
import {
  buildRecord,
  type PublicationType,
} from "src/utils/buildPublicationRecord";
import { isExternalLink } from "src/utils/externalPublicationLink";
import { supabaseServerClient } from "supabase/serverClient";

type PublishPagesResult =
  | { success: true; published: { entity: string; uri: string }[] }
  | {
      success: false;
      error: OAuthSessionError | { type: "other"; message: string };
    };

const err = (message: string): PublishPagesResult => ({
  success: false,
  error: { type: "other", message },
});

// Content page routes are single-segment lowercase slugs, plus the reserved
// home route "/".
const routeShape = /^\/[a-z0-9-]+$/;

// Publish a publication's draft leaflet in one go: page records, nav rows,
// and theme. Re-running converges: rkeys are stable per page entity, rows are
// upserts, and stale state is re-diffed every time.
export async function publishPublicationPages({
  publication_uri,
}: {
  publication_uri: string;
}): Promise<PublishPagesResult> {
  const identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }

  const { data: publication } = await supabaseServerClient
    .from("publications")
    .select("uri, identity_did, record, draft_leaflet")
    .eq("uri", publication_uri)
    .single();
  if (!publication || publication.identity_did !== identity.atp_did)
    return err("Not the publication owner");
  if (!publication.draft_leaflet)
    return err("This publication has no draft yet");

  const { data: token } = await supabaseServerClient
    .from("permission_tokens")
    .select("root_entity")
    .eq("id", publication.draft_leaflet)
    .single();
  if (!token) return err("Draft leaflet not found");
  const root_entity = token.root_entity;

  const { data: factData } = await supabaseServerClient.rpc("get_facts", {
    root: root_entity,
  });
  const facts = (factData as unknown as Fact<Attribute>[]) || [];

  const entries = readNavEntries(facts, root_entity);
  const contentPages = entries.filter((e) => !e.externalUrl);
  const externalLinks = entries.filter((e) => e.externalUrl);

  // Validate the whole nav before writing anything.
  const errors: string[] = [];
  if (!contentPages.some((p) => p.route === "/"))
    errors.push("The publication needs a home page at /");
  const seenRoutes = new Set<string>();
  for (const page of contentPages) {
    const label = page.title || page.route || "untitled page";
    if (!page.route) {
      errors.push(`"${label}" has no path`);
      continue;
    }
    if (page.route !== "/" && !routeShape.test(page.route)) {
      errors.push(`"${label}" has an invalid path (${page.route})`);
      continue;
    }
    if (seenRoutes.has(page.route))
      errors.push(`Multiple pages share the path ${page.route}`);
    seenRoutes.add(page.route);
  }
  for (const link of externalLinks) {
    if (!isExternalLink(link.externalUrl))
      errors.push(
        `"${link.title || "external link"}" has an invalid url (${link.externalUrl})`,
      );
  }
  if (errors.length > 0) return err(errors.join(". "));

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  const credentialSession = sessionResult.value;
  const agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  const { data: existingRows } = await supabaseServerClient
    .from("publication_pages")
    .select("id, page_entity, record_uri")
    .eq("publication", publication_uri);

  const hooks = makePublishUploadHooks(agent, credentialSession.did!);

  const published: { entity: string; uri: string }[] = [];
  for (const page of contentPages) {
    const record = await leafletToPublicationPageRecord({
      facts,
      root_entity,
      start_page: page.entity,
      publication_uri,
      path: page.route!,
      title: page.title,
      hooks,
    });

    // Reuse the published page's rkey so the record updates in place and
    // stays stable across renames and re-routes. New pages get a tid.
    const existing = existingRows?.find((r) => r.page_entity === page.entity);
    const rkey = existing?.record_uri
      ? new AtUri(existing.record_uri).rkey
      : TID.nextStr();
    const { data: putResult } = await agent.com.atproto.repo.putRecord({
      rkey,
      repo: credentialSession.did!,
      collection: "pub.leaflet.publicationPage",
      record,
      validate: false,
    });

    await supabaseServerClient.from("publication_pages").upsert(
      {
        publication: publication_uri,
        page_entity: page.entity,
        path: page.route,
        title: page.title,
        sort_order: page.position,
        record: record as unknown as Json,
        record_uri: putResult.uri,
      },
      { onConflict: "publication,page_entity" },
    );

    published.push({ entity: page.entity, uri: putResult.uri });
  }

  // External link tabs have no record on the network; their url lives in `path`.
  if (externalLinks.length > 0)
    await supabaseServerClient.from("publication_pages").upsert(
      externalLinks.map((link) => ({
        publication: publication_uri,
        page_entity: link.entity,
        path: link.externalUrl,
        title: link.title,
        sort_order: link.position,
        record: null,
        record_uri: null,
      })),
      { onConflict: "publication,page_entity" },
    );

  // Delete rows and PDS records for pages no longer in the draft, including
  // rows from before the single-draft-leaflet model (no page_entity at all).
  const draftEntities = new Set(entries.map((e) => e.entity));
  const staleRows = (existingRows ?? []).filter(
    (r) => !r.page_entity || !draftEntities.has(r.page_entity),
  );
  for (const row of staleRows) {
    if (!row.record_uri) continue;
    const uri = new AtUri(row.record_uri);
    await agent.com.atproto.repo.deleteRecord({
      repo: credentialSession.did!,
      collection: uri.collection,
      rkey: uri.rkey,
    });
  }
  if (staleRows.length > 0)
    await supabaseServerClient
      .from("publication_pages")
      .delete()
      .in(
        "id",
        staleRows.map((r) => r.id),
      );

  // Fold the draft theme facts into the publication record (pub.leaflet theme
  // plus the derived basicTheme for site.standard publications).
  const theme = await extractThemeFromFacts(facts, root_entity, agent);
  const normalizedPub = normalizePublicationRecord(publication.record);
  const aturi = new AtUri(publication.uri);
  const publicationType = getPublicationType(
    aturi.collection,
  ) as PublicationType;
  const existingBasePath = normalizedPub?.url
    ? normalizedPub.url.replace(/^https?:\/\//, "")
    : undefined;
  const basicTheme = leafletThemeToBasicTheme(theme);
  const pubRecord = buildRecord(
    normalizedPub,
    existingBasePath,
    publicationType,
    {
      theme,
      ...(basicTheme && { basicTheme }),
    },
  );
  await agent.com.atproto.repo.putRecord({
    repo: credentialSession.did!,
    rkey: aturi.rkey,
    record: pubRecord,
    collection: publicationType,
    validate: false,
  });
  await supabaseServerClient
    .from("publications")
    .update({ record: pubRecord as Json })
    .eq("uri", publication_uri);

  // Bust the cached reader routes so edits to existing pages show up — without
  // this only brand-new (uncached) page paths would reflect the latest content.
  revalidatePath("/lish/[did]/[publication]", "layout");

  return { success: true, published };
}
