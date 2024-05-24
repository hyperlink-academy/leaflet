import { WriteTransaction } from "replicache";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { FactWithIndexes } from "./utils";
import { Attributes } from "./attributes";
import { Fact } from ".";
import { MutationContext } from "./mutations";

export function clientMutationContext(tx: WriteTransaction) {
  let ctx: MutationContext = {
    async createEntity(_entityID) {
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
      let id = f.id || crypto.randomUUID();
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
              (existingFact[0]?.data as Fact<typeof f.attribute>["data"]).value,
            );
            const newUpdate = base64.toByteArray(f.data.value);
            const updateBytes = Y.mergeUpdatesV2([oldUpdate, newUpdate]);
            data.value = base64.fromByteArray(updateBytes);
          }
        }
      }
      await tx.set(id, FactWithIndexes({ id, ...f, data }));
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
