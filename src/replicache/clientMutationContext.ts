import { WriteTransaction } from "replicache";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { FactWithIndexes } from "./utils";
import { Attributes, FilterAttributes } from "./attributes";
import { Fact } from ".";
import { MutationContext } from "./mutations";
import { supabaseBrowserClient } from "supabase/browserClient";
import { v7 } from "uuid";

export function clientMutationContext(tx: WriteTransaction) {
  let ctx: MutationContext = {
    async runOnServer(cb) {},
    async runOnClient(cb) {
      let supabase = supabaseBrowserClient();
      return cb({ supabase });
    },
    async createEntity({ entityID }) {
      tx.set(entityID, true);
      return true;
    },
    scanIndex: {
      async eav(entity, attribute) {
        let existingFact = await tx
          .scan<Fact<typeof attribute>>({
            indexName: "eav",
            prefix: attribute ? `${entity}-${attribute}` : entity,
          })
          .toArray();
        return existingFact;
      },
    },
    async assertFact(f) {
      let attribute = Attributes[f.attribute as keyof typeof Attributes];
      if (!attribute) return;
      let id = f.id || v7();
      let data = { ...f.data };
      if (attribute.cardinality === "one") {
        let existingFact = await tx
          .scan<Fact<typeof f.attribute>>({
            indexName: "eav",
            prefix: `${f.entity}-${f.attribute}`,
          })
          .toArray();
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
      await tx.set(id, FactWithIndexes({ id, ...f, data }));
    },
    async retractFact(id) {
      await tx.del(id);
    },
    async deleteEntity(entity) {
      let existingFacts = await tx
        .scan<Fact<keyof typeof Attributes>>({
          indexName: "eav",
          prefix: `${entity}`,
        })
        .toArray();
      let references = await tx
        .scan<Fact<keyof typeof Attributes>>({
          indexName: "vae",
          prefix: entity,
        })
        .toArray();
      await Promise.all(
        [...existingFacts, ...references].map((f) => tx.del(f.id)),
      );
    },
  };
  return ctx;
}
