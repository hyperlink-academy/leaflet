import type { SQL } from "drizzle-orm";
import { v7 } from "uuid";
import { supabaseServerClient } from "supabase/serverClient";
import { markTitleBlockAsCopy } from "src/utils/markTitleBlockAsCopy";
import { insertLeaflet } from "src/utils/insertLeaflet";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

const ASSET_BUCKET = "minilink-user-assets";
const REFERENCE_TYPES = ["reference", "ordered-reference", "spatial-reference"];

/**
 * Deep-copy a leaflet's contents into a brand new entity set and permission
 * token: every fact reachable from `rootEntity`, with entity ids remapped and
 * uploaded assets duplicated in storage so neither copy can disturb the
 * other's images.
 *
 */
export async function copyLeafletContents({
  rootEntity,
  title,
  description,
  markAsCopy,
  facts,
  tailCte,
}: {
  rootEntity: string;
  title?: string | null;
  description?: string | null;
  // Write a "(Copy)" marker into the leaflet's title block, for copies whose
  // title lives in the document itself rather than in metadata.
  markAsCopy?: boolean;
  facts?: Fact<Attribute>[];
  tailCte?: (ids: { permTokenId: string; rootEntityId: string }) => SQL;
}): Promise<{ permTokenId: string; rootEntityId: string }> {
  let sourceFacts =
    facts ??
    (((await supabaseServerClient.rpc("get_facts", { root: rootEntity }))
      .data as unknown as Fact<Attribute>[]) ||
      []);
  sourceFacts = sourceFacts.filter(
    (f) => f.attribute !== "root/collapsed-blocks",
  );
  if (markAsCopy) sourceFacts = markTitleBlockAsCopy(sourceFacts, rootEntity);

  // Map reference targets as well as fact subjects: an entity that has no
  // facts of its own is still referenced, and leaving it unmapped would point
  // the copy back into the source's entity set.
  let entityIDMap: { [oldID: string]: string } = { [rootEntity]: v7() };
  let mapEntity = (id: string) => {
    if (!entityIDMap[id]) entityIDMap[id] = v7();
    return entityIDMap[id];
  };
  for (let fact of sourceFacts) {
    mapEntity(fact.entity);
    if (REFERENCE_TYPES.includes(fact.data.type))
      mapEntity((fact.data as { value: string }).value);
  }

  let newFacts = await Promise.all(
    sourceFacts.map(async (fact) => {
      let data = { ...fact.data };
      if (REFERENCE_TYPES.includes(data.type))
        (data as { value: string }).value =
          entityIDMap[(data as { value: string }).value];
      if (data.type === "image") data.src = await copyAsset(data.src);
      return {
        entity: entityIDMap[fact.entity],
        attribute: fact.attribute,
        data,
      };
    }),
  );

  const rootEntityId = entityIDMap[rootEntity];
  const { permTokenId } = await insertLeaflet({
    rootEntityId,
    entityIds: Object.values(entityIDMap),
    facts: newFacts,
    title,
    description,
    tailCte,
  });
  return { permTokenId, rootEntityId };
}

// Duplicate the storage object an image fact points at and return the rewritten
// url. Falls back to the original url if the copy fails — a shared asset still
// renders, a url pointing at an object that was never created would not.
async function copyAsset(src: string) {
  let [path, query] = src.split("?");
  let segments = path.split("/");
  let newID = v7();
  let { error } = await supabaseServerClient.storage
    .from(ASSET_BUCKET)
    .copy(segments[segments.length - 1], newID);
  if (error) return src;
  segments[segments.length - 1] = newID;
  return segments.join("/") + (query ? `?${query}` : "");
}
