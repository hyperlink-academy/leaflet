import { PgTransaction } from "drizzle-orm/pg-core";
import { Fact, PermissionToken } from ".";
import { MutationContext } from "./mutations";
import { supabaseServerClient } from "supabase/serverClient";
import { entities, facts } from "drizzle/schema";
import * as driz from "drizzle-orm";
import { Attribute, Attributes, FilterAttributes } from "./attributes";
import { v7 } from "uuid";
import { DeepReadonly } from "replicache";

type WriteCacheEntry =
  | { type: "put"; fact: Fact<any> }
  | { type: "del"; fact: { id: string } };

export function cachedServerMutationContext(
  tx: PgTransaction<any, any, any>,
  permission_token_id: string,
  token_rights: PermissionToken["permission_token_rights"],
  sessionDid: string | null,
) {
  let writeCache: WriteCacheEntry[] = [];
  let eavCache = new Map<string, DeepReadonly<Fact<Attribute>>[]>();
  let permissionsCache: { [key: string]: boolean } = {};
  let entitiesCache: { set: string; id: string }[] = [];
  let deleteEntitiesCache: string[] = [];
  let textAttributeWriteCache = {} as {
    [entityAttribute: string]: { [clientID: string]: string };
  };

  const scanIndex = {
    async eav<A extends Attribute>(entity: string, attribute: A) {
      if (deleteEntitiesCache.includes(entity)) return [];
      let cacheKey = `${entity}-${attribute}`;
      // The cache holds raw DB rows only; writeCache is merged in fresh on
      // every read so buffered puts aren't appended twice.
      let dbFacts = eavCache.get(cacheKey) as DeepReadonly<Fact<A>>[];
      if (!dbFacts) {
        dbFacts = (await tx
          .select({
            id: facts.id,
            data: facts.data,
            entity: facts.entity,
            attribute: facts.attribute,
            author_did: facts.author_did,
          })
          .from(facts)
          .where(
            driz.and(
              driz.eq(facts.attribute, attribute),
              driz.eq(facts.entity, entity),
            ),
          )) as DeepReadonly<Fact<A>>[];
        eavCache.set(cacheKey, dbFacts as DeepReadonly<Fact<Attribute>>[]);
      }
      // Any writeCache entry supersedes the stored row with the same id:
      // updates reuse fact ids, so masking only dels would return both the
      // stale DB row and its buffered replacement.
      let base = dbFacts.filter(
        (f) => !writeCache.find((wc) => wc.fact.id === f.id),
      );
      let newlyWrittenFacts = writeCache.filter(
        (f) =>
          f.type === "put" &&
          f.fact.attribute === attribute &&
          f.fact.entity === entity,
      );
      return [
        ...base,
        ...newlyWrittenFacts.map((f) => f.fact as Fact<A>),
      ].filter(
        (f) =>
          !(
            (f.data.type === "reference" ||
              f.data.type === "ordered-reference" ||
              f.data.type === "spatial-reference") &&
            deleteEntitiesCache.includes(f.data.value)
          ),
      ) as DeepReadonly<Fact<A>>[];
    },
    async id(factID: string) {
      let cached = writeCache.find((wc) => wc.fact.id === factID);
      if (cached)
        return cached.type === "del"
          ? undefined
          : (cached.fact as DeepReadonly<Fact<Attribute>>);
      let [row] = await tx
        .select({
          id: facts.id,
          data: facts.data,
          entity: facts.entity,
          attribute: facts.attribute,
          author_did: facts.author_did,
        })
        .from(facts)
        .where(driz.eq(facts.id, factID));
      return row as DeepReadonly<Fact<Attribute>> | undefined;
    },
  };

  let getContext = (clientID: string, mutationID: number) => {
    let ctx: MutationContext & {
      checkPermission: (entity: string) => Promise<boolean>;
    } = {
      scanIndex,
      permission_token_id,
      async runOnServer(cb) {
        return cb({ supabase: supabaseServerClient });
      },
      async checkPermission(entity: string) {
        if (deleteEntitiesCache.includes(entity)) return false;
        let cachedEntity = entitiesCache.find((e) => e.id === entity);
        if (cachedEntity) {
          return !!token_rights.find(
            (r) => r.entity_set === cachedEntity?.set && r.write === true,
          );
        }
        if (permissionsCache[entity] !== undefined)
          return permissionsCache[entity];
        let [permission_set] = await tx
          .select({ entity_set: entities.set })
          .from(entities)
          .where(driz.eq(entities.id, entity));
        let hasPermission =
          !!permission_set &&
          !!token_rights.find(
            (r) =>
              r.entity_set === permission_set.entity_set && r.write == true,
          );
        permissionsCache[entity] = hasPermission;
        return hasPermission;
      },
      async runOnClient(_cb) {},
      async createEntity({ entityID, permission_set }) {
        if (
          !token_rights.find(
            (r) => r.entity_set === permission_set && r.write === true,
          )
        ) {
          return false;
        }
        if (!entitiesCache.find((e) => e.id === entityID))
          entitiesCache.push({ set: permission_set, id: entityID });
        deleteEntitiesCache = deleteEntitiesCache.filter((e) => e !== entityID);
        return true;
      },
      async deleteEntity(entity) {
        if (!(await this.checkPermission(entity))) return;
        deleteEntitiesCache.push(entity);
        entitiesCache = entitiesCache.filter((e) => e.id !== entity);
        writeCache = writeCache.filter(
          (f) =>
            f.type !== "put" ||
            (f.fact.entity !== entity && f.fact.data.value !== entity),
        );
      },
      async assertFact(f) {
        if (!f.entity) return;
        let attribute = Attributes[f.attribute as Attribute];
        if (!attribute) return;
        let id = f.id || v7();
        let data = { ...f.data };
        if (!(await this.checkPermission(f.entity))) return;

        let existing: DeepReadonly<Fact<Attribute>> | undefined;
        if (attribute.cardinality === "one") {
          let existingFact = await scanIndex.eav(f.entity, f.attribute);
          if (existingFact[0]) {
            id = existingFact[0].id;
            existing = existingFact[0];
          }
        } else if (f.id) {
          // cardinality "many" update with an explicit id: look up the stored
          // fact so its author_did can gate the write.
          existing = await scanIndex.id(f.id);
        }

        // Authentication gate. author_did is immutable once set.
        let author_did: string | null;
        if (existing) {
          // Updating an existing fact: if it's authenticated, only the owning
          // DID may write it, and the stored DID is preserved regardless of
          // what the client sends.
          if (existing.author_did && sessionDid !== existing.author_did) return;
          author_did = existing.author_did ?? null;
        } else {
          // Creating a fact: you may only authenticate it as yourself.
          if (f.author_did && sessionDid !== f.author_did) return;
          author_did = f.author_did ?? null;
        }

        writeCache = writeCache.filter((f) => f.fact.id !== id);
        writeCache.push({
          type: "put",
          fact: {
            id: id,
            entity: f.entity,
            data: data,
            attribute: f.attribute,
            author_did,
          },
        });
      },
      async retractFact(factID) {
        let existing = await scanIndex.id(factID);
        if (!existing || !(await this.checkPermission(existing.entity))) return;
        // Only the owning DID may retract an authenticated fact.
        if (existing.author_did && sessionDid !== existing.author_did) return;
        writeCache = writeCache.filter((f) => f.fact.id !== factID);
        writeCache.push({ type: "del", fact: { id: factID } });
      },
    };
    return ctx;
  };
  let flush = async () => {
    let flushStart = performance.now();
    let timeInsertingEntities = 0;
    let timeProcessingFactWrites = 0;
    let timeDeletingEntities = 0;
    let timeDeletingFacts = 0;
    let timeCacheCleanup = 0;

    // Insert entities
    let entityInsertStart = performance.now();
    if (entitiesCache.length > 0)
      await tx
        .insert(entities)
        .values(entitiesCache.map((e) => ({ set: e.set, id: e.id })))
        .onConflictDoNothing({ target: entities.id });
    timeInsertingEntities = performance.now() - entityInsertStart;

    // Process fact writes
    let factWritesStart = performance.now();
    let factWrites = writeCache.flatMap((f) =>
      f.type === "del" ? [] : [f.fact],
    );
    if (factWrites.length > 0) {
      await tx
        .insert(facts)
        .values(
          factWrites.map((f) => ({
            id: f.id,
            entity: f.entity,
            data: driz.sql`${f.data}::jsonb`,
            attribute: f.attribute,
            author_did: f.author_did ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: facts.id,
          // author_did is intentionally omitted here: it is immutable, so an
          // update of an existing fact must never overwrite the stored DID.
          set: {
            data: driz.sql`excluded.data`,
            entity: driz.sql`excluded.entity`,
          },
        });
    }
    timeProcessingFactWrites = performance.now() - factWritesStart;

    // Delete entities
    let entityDeleteStart = performance.now();
    if (deleteEntitiesCache.length > 0)
      await tx
        .delete(entities)
        .where(driz.inArray(entities.id, deleteEntitiesCache));
    timeDeletingEntities = performance.now() - entityDeleteStart;

    // Delete facts
    let factDeleteStart = performance.now();
    let factDeletes = writeCache.flatMap((f) =>
      f.type === "put" ? [] : [f.fact.id],
    );
    if (factDeletes.length > 0 || deleteEntitiesCache.length > 0) {
      const conditions = [];
      if (factDeletes.length > 0) {
        conditions.push(driz.inArray(facts.id, factDeletes));
      }
      if (deleteEntitiesCache.length > 0) {
        conditions.push(
          driz.and(
            driz.sql`(data->>'type' = 'ordered-reference' or data->>'type' = 'reference' or data->>'type' = 'spatial-reference')`,
            driz.inArray(driz.sql`data->>'value'`, deleteEntitiesCache),
          ),
        );
      }
      if (conditions.length > 0) {
        await tx.delete(facts).where(driz.or(...conditions));
      }
    }
    timeDeletingFacts = performance.now() - factDeleteStart;

    // Cache cleanup
    let cacheCleanupStart = performance.now();
    writeCache = [];
    eavCache.clear();
    permissionsCache = {};
    entitiesCache = [];
    permissionsCache = {};
    deleteEntitiesCache = [];
    timeCacheCleanup = performance.now() - cacheCleanupStart;

    let totalFlushTime = performance.now() - flushStart;
    console.log(`
Flush Performance Breakdown (${totalFlushTime.toFixed(2)}ms):
==========================================
Entity Insertions (${entitiesCache.length} entities):     ${timeInsertingEntities.toFixed(2)}ms
Fact Processing (${factWrites.length} facts):             ${timeProcessingFactWrites.toFixed(2)}ms
Entity Deletions (${deleteEntitiesCache.length} entities): ${timeDeletingEntities.toFixed(2)}ms
Fact Deletions:                                           ${timeDeletingFacts.toFixed(2)}ms
Cache Cleanup:                                             ${timeCacheCleanup.toFixed(2)}ms
    `);
  };

  return {
    getContext,
    flush,
  };
}
