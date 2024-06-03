import { PgTransaction } from "drizzle-orm/pg-core";
import * as driz from "drizzle-orm";
import * as base64 from "base64-js";
import * as Y from "yjs";
import { MutationContext } from "./mutations";
import { entities, facts } from "drizzle/schema";
import { Attributes, FilterAttributes } from "./attributes";
import { Fact } from ".";
import { DeepReadonly } from "replicache";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
export function serverMutationContext(tx: PgTransaction<any, any, any>) {
  let ctx: MutationContext = {
    async runOnServer(cb) {
      let supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      );
      return cb({ supabase });
    },
    async runOnClient(_cb) {},
    async createEntity(entity) {
      await tx.transaction(
        async (tx2) =>
          await tx2
            .insert(entities)
            .values({
              id: entity,
            })
            .catch(console.log),
      );
      return true;
    },
    scanIndex: {
      async eav(entity, attribute) {
        return (await tx
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
          )) as DeepReadonly<Fact<typeof attribute>>[];
      },
    },
    async assertFact(f) {
      let attribute = Attributes[f.attribute as keyof typeof Attributes];
      if (!attribute) return;
      let id = f.id || crypto.randomUUID();
      let data = { ...f.data };
      if (attribute.cardinality === "one") {
        let existingFact = await tx
          .select({ id: facts.id, data: facts.data })
          .from(facts)
          .where(
            driz.and(
              driz.eq(facts.attribute, f.attribute),
              driz.eq(facts.entity, f.entity),
            ),
          );
        if (existingFact[0]) {
          id = existingFact[0].id;
          if (attribute.type === "text") {
            const oldUpdate = base64.toByteArray(
              (
                existingFact[0]?.data as Fact<
                  keyof FilterAttributes<{ type: "text" }>
                >["data"]
              ).value,
            );

            let textData = data as Fact<
              keyof FilterAttributes<{ type: "text" }>
            >["data"];
            const newUpdate = base64.toByteArray(textData.value);
            const updateBytes = Y.mergeUpdates([oldUpdate, newUpdate]);
            textData.value = base64.fromByteArray(updateBytes);
          }
        }
      }
      await tx.transaction(
        async (tx2) =>
          await tx2
            .insert(facts)
            .values({
              id: id,
              entity: f.entity,
              data: driz.sql`${data}::jsonb`,
              attribute: f.attribute,
            })
            .onConflictDoUpdate({
              target: facts.id,
              set: { data: driz.sql`${f.data}::jsonb` },
            })
            .catch((e) => {
              console.log(`error on inserting fact: `, JSON.stringify(e));
            }),
      );
    },
    async deleteEntity(entity) {
      await Promise.all([
        tx.delete(entities).where(driz.eq(entities.id, entity)),
        tx
          .delete(facts)
          .where(
            driz.sql`(data->>'type' = 'ordered-reference' or data ->>'type' = 'reference') and data->>'value' = ${entity}`,
          ),
      ]);
    },
  };
  return ctx;
}
