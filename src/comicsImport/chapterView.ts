import { v7 } from "uuid";
import { supabaseServerClient } from "supabase/serverClient";
import { createPublicationDraftLeaflet } from "actions/createPublicationDraftLeaflet";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

// Switch every posts-list block in the publication's draft pages to the
// chapter layout (creating the default draft, with its home page and posts
// list, if the publication has none). The draft still has to be published
// for readers to see it.
export async function enableChapterView(pub: {
  uri: string;
  identity_did: string;
  record: unknown;
  draft_leaflet: string | null;
}): Promise<{ blocks: number }> {
  const pubRecord = normalizePublicationRecord(pub.record);
  const draftLeaflet =
    pub.draft_leaflet ??
    (await createPublicationDraftLeaflet({
      publication_uri: pub.uri,
      did: pub.identity_did,
      description: pubRecord?.description,
      theme: resolvePublicationTheme(pubRecord),
    }));
  const { data: token } = await supabaseServerClient
    .from("permission_tokens")
    .select("root_entity")
    .eq("id", draftLeaflet)
    .single()
    .throwOnError();
  const { data: factData } = await supabaseServerClient
    .rpc("get_facts", { root: token!.root_entity })
    .throwOnError();
  const facts = (factData as unknown as Fact<Attribute>[]) ?? [];
  const lists = facts.filter(
    (f) =>
      f.attribute === "block/type" &&
      (f as Fact<"block/type">).data.value === "posts-list",
  );
  if (lists.length === 0)
    throw new Error("The publication's draft pages have no posts list");
  for (const list of lists) {
    const existing = facts.find(
      (f) => f.entity === list.entity && f.attribute === "posts-list/view",
    );
    await supabaseServerClient
      .from("facts")
      .upsert({
        id: existing?.id ?? v7(),
        entity: list.entity,
        attribute: "posts-list/view",
        data: { type: "posts-list-view-union", value: "chapter" },
      })
      .throwOnError();
  }
  return { blocks: lists.length };
}
