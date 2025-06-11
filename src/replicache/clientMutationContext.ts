import { Replicache, WriteTransaction } from "replicache";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { FactWithIndexes, scanIndex } from "./utils";
import { Attribute, Attributes, FilterAttributes } from "./attributes";
import type { Fact, ReplicacheMutators } from ".";
import { FactInput, MutationContext } from "./mutations";
import { supabaseBrowserClient } from "supabase/browserClient";
import { v7 } from "uuid";
import { UndoManager } from "src/undoManager";

export function clientMutationContext(
  tx: WriteTransaction,
  {
    rep,
    undoManager,
    ignoreUndo,
    defaultEntitySet,
    permission_token_id,
  }: {
    undoManager: UndoManager;
    rep: Replicache<ReplicacheMutators>;
    ignoreUndo: boolean;
    defaultEntitySet: string;
    permission_token_id: string;
  },
) {
  let ctx: MutationContext = {
    permission_token_id,
    async runOnServer(cb) {},
    async runOnClient(cb) {
      let supabase = supabaseBrowserClient();
      return cb({ supabase, tx });
    },
    async createEntity({ entityID }) {
      tx.set(entityID, true);
      return true;
    },
    scanIndex: {
      async eav(entity, attribute) {
        return scanIndex(tx).eav(entity, attribute);
      },
    },
    async assertFact(f) {
      let attribute = Attributes[f.attribute as Attribute];
      if (!attribute) return;
      let id = f.id || v7();
      let data = { ...f.data };
      let existingFact = [] as Fact<any>[];
      if (attribute.cardinality === "one") {
        existingFact = await scanIndex(tx).eav(f.entity, f.attribute);
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
      if (!ignoreUndo)
        undoManager.add({
          undo: () => {
            if (existingFact[0]) {
              rep.mutate.assertFact({ ignoreUndo: true, ...existingFact[0] });
            } else {
              if (attribute.cardinality === "one" && !f.id)
                rep.mutate.retractAttribute({
                  ignoreUndo: true,
                  attribute: f.attribute as keyof FilterAttributes<{
                    cardinality: "one";
                  }>,
                  entity: f.entity,
                });
              rep.mutate.retractFact({ ignoreUndo: true, factID: id });
            }
          },
          redo: () => {
            rep.mutate.assertFact({ ignoreUndo: true, ...(f as Fact<any>) });
          },
        });
      await tx.set(id, FactWithIndexes({ id, ...f, data }));
    },
    async retractFact(id) {
      let fact = await tx.get(id);
      if (!ignoreUndo)
        undoManager.add({
          undo: () => {
            if (fact) {
              rep.mutate.assertFact({
                ignoreUndo: true,
                ...(fact as Fact<any>),
              });
            } else {
              rep.mutate.retractFact({ ignoreUndo: true, factID: id });
            }
          },
          redo: () => {
            rep.mutate.retractFact({ factID: id });
          },
        });
      await tx.del(id);
    },
    async deleteEntity(entity) {
      let existingFacts = await tx
        .scan<Fact<Attribute>>({
          indexName: "eav",
          prefix: `${entity}`,
        })
        .toArray();
      let references = await tx
        .scan<Fact<Attribute>>({
          indexName: "vae",
          prefix: entity,
        })
        .toArray();
      let facts = [...existingFacts, ...references];
      await Promise.all(facts.map((f) => tx.del(f.id)));
      if (!ignoreUndo && facts.length > 0) {
        undoManager.add({
          undo: async () => {
            let input: FactInput[] & { ignoreUndo?: true } = facts.map(
              (f) =>
                ({
                  id: f.id,
                  attribute: f.attribute,
                  entity: f.entity,
                  data: f.data,
                }) as FactInput,
            );
            input.ignoreUndo = true;
            await rep.mutate.createEntity([
              { entityID: entity, permission_set: defaultEntitySet },
            ]);
            await rep.mutate.assertFact(input);
          },
          redo: () => {
            rep.mutate.deleteEntity({ entity, ignoreUndo: true });
          },
        });
      }
    },
  };
  return ctx;
}
