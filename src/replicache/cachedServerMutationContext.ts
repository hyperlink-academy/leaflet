import { PgTransaction } from "drizzle-orm/pg-core";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { Fact, PermissionToken } from ".";
import { MutationContext } from "./mutations";
import { supabaseServerClient } from "supabase/serverClient";
import { entities, facts } from "drizzle/schema";
import * as driz from "drizzle-orm";
import { Attribute, Attributes, FilterAttributes } from "./attributes";
import { v7 } from "uuid";
import { DeepReadonly } from "replicache";

type TextData = Fact<keyof FilterAttributes<{ type: "text" }>>["data"];

type WriteCacheEntry =
  | { type: "put"; fact: Fact<any> }
  | { type: "del"; fact: { id: string } };

export function cachedServerMutationContext(
  tx: PgTransaction<any, any, any>,
  permission_token_id: string,
  token_rights: PermissionToken["permission_token_rights"],
  sessionDid: string | null,
  rootEntity: string,
  options?: { trustedAuthorWrites?: boolean },
) {
  let trustedAuthorWrites = options?.trustedAuthorWrites ?? false;
  let writeCache = new Map<string, WriteCacheEntry>();
  let writtenKeys = new Map<string, Set<string>>();
  const keyFor = (entity: string, attribute: string) =>
    `${entity}-${attribute}`;
  const rememberWrite = (write: WriteCacheEntry) => {
    writeCache.set(write.fact.id, write);
    if (write.type === "put") {
      const key = keyFor(write.fact.entity, write.fact.attribute);
      const ids = writtenKeys.get(key) ?? new Set<string>();
      ids.add(write.fact.id);
      writtenKeys.set(key, ids);
    }
  };
  let eavCache = new Map<string, DeepReadonly<Fact<Attribute>>[]>();
  const loadedEntities = new Set<string>();
  const idCache = new Map<string, DeepReadonly<Fact<Attribute>> | undefined>();
  let permissionsCache: { [key: string]: boolean } = {};
  let entitiesCache = new Map<string, { set: string; id: string }>();
  let deleteEntitiesCache = new Set<string>();
  const selectFacts = () =>
    tx
      .select({
        id: facts.id,
        data: facts.data,
        entity: facts.entity,
        attribute: facts.attribute,
        author_did: facts.author_did,
      })
      .from(facts);
  const mayWrite = (set: string) =>
    token_rights.some((right) => right.entity_set === set && right.write);
  const prefetch: NonNullable<MutationContext["prefetch"]> = async (
    entityIDs,
    factIDs = [],
  ) => {
    if (entityIDs.length + factIDs.length > 5_000) {
      for (const group of batches([...new Set(entityIDs)]))
        await prefetch(group);
      for (const group of batches([...new Set(factIDs)]))
        await prefetch([], group);
      return;
    }
    const keys = [...new Set(entityIDs)].filter(
      (id) => !loadedEntities.has(id),
    );
    const ids = [...new Set(factIDs)].filter(
      (id) => !idCache.has(id) && !writeCache.has(id),
    );
    if (keys.length || ids.length) {
      const rows = (await selectFacts().where(
        driz.or(
          keys.length ? driz.inArray(facts.entity, keys) : undefined,
          ids.length ? driz.inArray(facts.id, ids) : undefined,
        ),
      )) as DeepReadonly<Fact<Attribute>>[];
      for (const id of keys) loadedEntities.add(id);
      const requestedEntities = new Set(keys);
      for (const id of ids) idCache.set(id, undefined);
      const loaded = new Map<string, DeepReadonly<Fact<Attribute>>[]>();
      for (const fact of rows) {
        idCache.set(fact.id, fact);
        if (!requestedEntities.has(fact.entity)) continue;
        const key = keyFor(fact.entity, fact.attribute);
        const bucket = loaded.get(key) ?? [];
        bucket.push(fact);
        loaded.set(key, bucket);
      }
      for (const [key, bucket] of loaded) eavCache.set(key, bucket);
    }
    const permissionIDs = keys.filter(
      (id) => !entitiesCache.has(id) && permissionsCache[id] === undefined,
    );
    if (permissionIDs.length) {
      const permissions = await tx
        .select({ id: entities.id, set: entities.set })
        .from(entities)
        .where(driz.inArray(entities.id, permissionIDs));
      for (const id of permissionIDs) permissionsCache[id] = false;
      for (const item of permissions)
        permissionsCache[item.id] = mayWrite(item.set);
    }
  };
  // Text facts store the full encoded yjs doc state, so a write from a client
  // whose doc is behind (stale initial state, long-offline tab) would silently
  // delete newer content if it simply replaced the row. Every updated text
  // fact is instead merged with the stored value at flush. Values are tracked
  // per (entity+attribute, clientID): consecutive writes from one client are
  // cumulative (each carries full state, so the latest supersedes the rest),
  // which keeps a large replayed batch at one merge per fact instead of one
  // per mutation. `base` is the stored row's value captured before this
  // push's first buffered write masked it in scanIndex.
  let textAttributeWriteCache = {} as {
    [entityAttribute: string]: {
      base: string;
      byClient: { [clientID: string]: string };
    };
  };

  const scanIndex = {
    async eav<A extends Attribute>(entity: string, attribute: A) {
      if (deleteEntitiesCache.has(entity)) return [];
      let cacheKey = `${entity}-${attribute}`;
      // The cache holds raw DB rows only; writeCache is merged in fresh on
      // every read so buffered puts aren't appended twice.
      let dbFacts = eavCache.get(cacheKey) as DeepReadonly<Fact<A>>[];
      if (!dbFacts && loadedEntities.has(entity)) dbFacts = [];
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
        for (const fact of dbFacts)
          idCache.set(fact.id, fact as DeepReadonly<Fact<Attribute>>);
      }
      // Any writeCache entry supersedes the stored row with the same id:
      // updates reuse fact ids, so masking only dels would return both the
      // stale DB row and its buffered replacement.
      let base = dbFacts.filter((f) => !writeCache.has(f.id));
      const newlyWrittenFacts = [...(writtenKeys.get(cacheKey) ?? [])].flatMap(
        (id) => {
          const write = writeCache.get(id);
          return write?.type === "put" &&
            write.fact.entity === entity &&
            write.fact.attribute === attribute
            ? [write.fact]
            : [];
        },
      );
      return [...base, ...newlyWrittenFacts].filter(
        (f) =>
          !(
            (f.data.type === "reference" ||
              f.data.type === "ordered-reference" ||
              f.data.type === "spatial-reference") &&
            deleteEntitiesCache.has(f.data.value)
          ),
      ) as DeepReadonly<Fact<A>>[];
    },
    async id(factID: string) {
      let cached = writeCache.get(factID);
      if (cached)
        return cached.type === "del"
          ? undefined
          : (cached.fact as DeepReadonly<Fact<Attribute>>);
      if (idCache.has(factID)) return idCache.get(factID);
      const [row] = await selectFacts().where(driz.eq(facts.id, factID));
      const fact = row as DeepReadonly<Fact<Attribute>> | undefined;
      idCache.set(factID, fact);
      return fact;
    },
  };

  let getContext = (clientID: string, mutationID: number) => {
    let ctx: MutationContext & {
      checkPermission: (entity: string) => Promise<boolean>;
    } = {
      scanIndex,
      prefetch,
      permission_token_id,
      rootEntity,
      sessionDid,
      async runOnServer(cb) {
        return cb({ supabase: supabaseServerClient });
      },
      async checkPermission(entity: string) {
        if (deleteEntitiesCache.has(entity)) return false;
        let cachedEntity = entitiesCache.get(entity);
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
        if (!entitiesCache.has(entityID))
          entitiesCache.set(entityID, { set: permission_set, id: entityID });
        deleteEntitiesCache.delete(entityID);
        return true;
      },
      async deleteEntity(entity) {
        if (!(await this.checkPermission(entity))) return;
        deleteEntitiesCache.add(entity);
        entitiesCache.delete(entity);
        for (const [id, entry] of writeCache) {
          if (
            entry.type === "put" &&
            (entry.fact.entity === entity || entry.fact.data.value === entity)
          )
            writeCache.delete(id);
        }
        for (let key of Object.keys(textAttributeWriteCache)) {
          if (key.startsWith(`${entity}-`)) delete textAttributeWriteCache[key];
        }
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

        let author_did = f.author_did ?? null;
        if (existing) author_did = existing.author_did ?? null;
        if (!trustedAuthorWrites && author_did && sessionDid !== author_did)
          return;

        if (trustedAuthorWrites && f.author_did !== undefined)
          author_did = f.author_did;

        if (
          attribute.type === "text" &&
          attribute.cardinality === "one" &&
          existing
        ) {
          let key = `${f.entity}-${f.attribute}`;
          let tracked = (textAttributeWriteCache[key] ??= {
            base: (existing.data as TextData).value,
            byClient: {},
          });
          tracked.byClient[clientID] = (data as TextData).value;
        }

        rememberWrite({
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
        if (
          !trustedAuthorWrites &&
          existing.author_did &&
          sessionDid !== existing.author_did
        )
          return;
        // A genuine deletion must not be merged back by a later assert.
        delete textAttributeWriteCache[
          `${existing.entity}-${existing.attribute}`
        ];
        rememberWrite({ type: "del", fact: { id: factID } });
      },
    };
    return ctx;
  };
  // Snapshot of every buffered write, so a mutation that throws part-way can
  // be rolled back instead of flushing the half it got through. eavCache and
  // permissionsCache hold only what's in the database, so they're unaffected.
  let checkpoint = () => {
    let saved = {
      writeCache: new Map(writeCache),
      entitiesCache: new Map(entitiesCache),
      deleteEntitiesCache: new Set(deleteEntitiesCache),
      textAttributeWriteCache: structuredClone(textAttributeWriteCache),
    };
    return () => {
      writeCache = new Map();
      writtenKeys = new Map();
      for (const write of saved.writeCache.values()) rememberWrite(write);
      entitiesCache = saved.entitiesCache;
      deleteEntitiesCache = saved.deleteEntitiesCache;
      textAttributeWriteCache = saved.textAttributeWriteCache;
    };
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
    const entityWrites = [...entitiesCache.values()];
    for (const batch of batches(entityWrites))
      await tx
        .insert(entities)
        .values(batch)
        .onConflictDoNothing({ target: entities.id });
    timeInsertingEntities = performance.now() - entityInsertStart;

    // Process fact writes
    let factWritesStart = performance.now();
    let factWrites = [...writeCache.values()].flatMap((f) =>
      f.type === "del" ? [] : [f.fact],
    );
    for (let fact of factWrites) {
      let tracked = textAttributeWriteCache[`${fact.entity}-${fact.attribute}`];
      if (!tracked) continue;
      let values = Object.values(tracked.byClient);
      if (!values.includes(tracked.base)) values.push(tracked.base);
      if (values.length < 2) continue;
      try {
        (fact.data as TextData).value = base64.fromByteArray(
          Y.mergeUpdates(values.map((v) => base64.toByteArray(v))),
        );
      } catch (e) {
        // A value that won't decode shouldn't fail the whole push; fall back
        // to the buffered (latest client) value for this fact.
        console.log(
          `error merging text fact ${fact.id}, writing unmerged:`,
          JSON.stringify(e),
        );
      }
    }
    for (const batch of batches(factWrites)) {
      await tx
        .insert(facts)
        .values(
          batch.map((f) => ({
            id: f.id,
            entity: f.entity,
            data: driz.sql`${f.data}::jsonb`,
            attribute: f.attribute,
            author_did: f.author_did ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: facts.id,
          set: {
            data: driz.sql`excluded.data`,
            entity: driz.sql`excluded.entity`,
            ...(trustedAuthorWrites
              ? { author_did: driz.sql`excluded.author_did` }
              : {}),
          },
        });
    }
    timeProcessingFactWrites = performance.now() - factWritesStart;

    // Delete entities
    let entityDeleteStart = performance.now();
    const entityDeletes = [...deleteEntitiesCache];
    for (const batch of batches(entityDeletes))
      await tx.delete(entities).where(driz.inArray(entities.id, batch));
    timeDeletingEntities = performance.now() - entityDeleteStart;

    // Delete facts
    let factDeleteStart = performance.now();
    let factDeletes = [...writeCache.values()].flatMap((f) =>
      f.type === "put" ? [] : [f.fact.id],
    );
    for (const batch of batches(factDeletes))
      await tx.delete(facts).where(driz.inArray(facts.id, batch));
    for (const batch of batches(entityDeletes))
      await tx
        .delete(facts)
        .where(
          driz.and(
            driz.sql`(data->>'type' = 'ordered-reference' or data->>'type' = 'reference' or data->>'type' = 'spatial-reference')`,
            driz.inArray(driz.sql`data->>'value'`, batch),
          ),
        );
    timeDeletingFacts = performance.now() - factDeleteStart;

    // Cache cleanup
    let cacheCleanupStart = performance.now();
    writeCache.clear();
    writtenKeys.clear();
    eavCache.clear();
    loadedEntities.clear();
    idCache.clear();
    permissionsCache = {};
    entitiesCache.clear();
    deleteEntitiesCache.clear();
    textAttributeWriteCache = {};
    timeCacheCleanup = performance.now() - cacheCleanupStart;

    let totalFlushTime = performance.now() - flushStart;
    console.log(`
Flush Performance Breakdown (${totalFlushTime.toFixed(2)}ms):
==========================================
Entity Insertions (${entityWrites.length} entities):     ${timeInsertingEntities.toFixed(2)}ms
Fact Processing (${factWrites.length} facts):             ${timeProcessingFactWrites.toFixed(2)}ms
Entity Deletions (${entityDeletes.length} entities): ${timeDeletingEntities.toFixed(2)}ms
Fact Deletions:                                           ${timeDeletingFacts.toFixed(2)}ms
Cache Cleanup:                                             ${timeCacheCleanup.toFixed(2)}ms
    `);
  };

  return {
    getContext,
    checkpoint,
    flush,
  };
}

// Keep parameter counts and statement sizes bounded within the push transaction.
function* batches<T>(items: T[]) {
  const batchSize = 1_000;
  for (let start = 0; start < items.length; start += batchSize)
    yield items.slice(start, start + batchSize);
}
