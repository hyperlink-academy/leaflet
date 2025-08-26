import { PgTransaction } from "drizzle-orm/pg-core";
import { Fact, PermissionToken } from ".";
import { MutationContext } from "./mutations";
import { supabaseServerClient } from "supabase/serverClient";
import { entities, facts } from "drizzle/schema";
import * as driz from "drizzle-orm";
import { Attribute, Attributes, FilterAttributes } from "./attributes";
import { v7 } from "uuid";
import * as base64 from "base64-js";
import * as Y from "yjs";
import { DeepReadonly } from "replicache";

type WriteCacheEntry =
  | { type: "put"; fact: Fact<any> }
  | { type: "del"; fact: { id: string } };
export function cachedServerMutationContext(
  tx: PgTransaction<any, any, any>,
  permission_token_id: string,
  token_rights: PermissionToken["permission_token_rights"],
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
      let cached = eavCache.get(`${entity}-${attribute}`) as DeepReadonly<
        Fact<A>
      >[];
      let baseFacts: DeepReadonly<Fact<A>>[];
      if (deleteEntitiesCache.includes(entity)) return [];
      if (cached) baseFacts = cached;
      else {
        cached = (await tx
          .select({
            id: facts.id,
            data: facts.data,
            entity: facts.entity,
            attribute: facts.attribute,
          })
          .from(facts)
          .where(
            driz.and(
              driz.eq(facts.attribute, attribute),
              driz.eq(facts.entity, entity),
            ),
          )) as DeepReadonly<Fact<A>>[];
      }
      cached = cached.filter(
        (f) =>
          !writeCache.find((wc) => wc.type === "del" && wc.fact.id === f.id),
      );
      let newlyWrittenFacts = writeCache.filter(
        (f) =>
          f.type === "put" &&
          f.fact.attribute === attribute &&
          f.fact.entity === entity,
      );
      return [
        ...cached,
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
        deleteEntitiesCache = deleteEntitiesCache.filter((e) => e === entityID);
        return true;
      },
      async deleteEntity(entity) {
        if (!(await this.checkPermission(entity))) return;
        deleteEntitiesCache.push(entity);
        entitiesCache = entitiesCache.filter((e) => e.id === entity);
      },
      async assertFact(f) {
        if (!f.entity) return;
        let attribute = Attributes[f.attribute as Attribute];
        if (!attribute) return;
        let id = f.id || v7();
        let data = { ...f.data };
        if (!(await this.checkPermission(f.entity))) return;
        if (attribute.cardinality === "one") {
          let existingFact = await scanIndex.eav(f.entity, f.attribute);
          if (existingFact[0]) {
            id = existingFact[0].id;
            if (attribute.type === "text") {
              let c =
                textAttributeWriteCache[`${f.entity}-${f.attribute}`] || {};
              textAttributeWriteCache[`${f.entity}-${f.attribute}`] = {
                ...c,
                [clientID]: (
                  data as Fact<keyof FilterAttributes<{ type: "text" }>>["data"]
                ).value,
              };
            }
          }
        }
        writeCache = writeCache.filter((f) => f.fact.id !== id);
        writeCache.push({
          type: "put",
          fact: {
            id: id,
            entity: f.entity,
            data: data,
            attribute: f.attribute,
          },
        });
      },
      async retractFact(factID) {
        writeCache = writeCache.filter((f) => f.fact.id !== factID);
        writeCache.push({ type: "del", fact: { id: factID } });
      },
    };
    return ctx;
  };
  let flush = async () => {
    if (entitiesCache.length > 0)
      await tx
        .insert(entities)
        .values(entitiesCache.map((e) => ({ set: e.set, id: e.id })));
    let factWrites = writeCache.flatMap((f) =>
      f.type === "del" ? [] : [f.fact],
    );
    if (factWrites.length > 0)
      await tx
        .insert(facts)
        .values(
          await Promise.all(
            factWrites.map(async (f) => {
              let attribute = Attributes[f.attribute as Attribute];
              let data = f.data;
              if (
                attribute.type === "text" &&
                attribute.cardinality === "one"
              ) {
                let values = Object.values(
                  textAttributeWriteCache[`${f.entity}-${f.attribute}`],
                );

                let existingFact = await scanIndex.eav(f.entity, f.attribute);
                if (existingFact[0]) values.push(existingFact[0].data.value);
                let updateBytes = Y.mergeUpdates(
                  values.map((v) => base64.toByteArray(v)),
                );
                data.value = base64.fromByteArray(updateBytes);
              }

              return {
                id: f.id,
                entity: f.entity,
                data: driz.sql`${data}::jsonb`,
                attribute: f.attribute,
              };
            }),
          ),
        )
        .onConflictDoUpdate({
          target: facts.id,
          set: { data: driz.sql`excluded.data` },
        });
    if (deleteEntitiesCache.length > 0)
      await tx
        .delete(entities)
        .where(driz.inArray(entities.id, deleteEntitiesCache));
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

    writeCache = [];
    eavCache.clear();
    permissionsCache = {};
    entitiesCache = [];
    deleteEntitiesCache = [];
  };

  return {
    getContext,
    flush,
  };
}
