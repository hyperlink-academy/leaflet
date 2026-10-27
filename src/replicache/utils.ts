import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as driz from "drizzle-orm";
import type { Fact } from ".";
import { replicache_clients } from "drizzle/schema";
import type { Attribute, FilterAttributes } from "./attributes";
import { ReadTransaction, WriteTransaction } from "replicache";
import { PgTransaction } from "drizzle-orm/pg-core";

export function FactWithIndexes(f: Fact<Attribute>) {
  let indexes: {
    eav: string;
    vae?: string;
  } = {
    eav: `${f.entity}-${f.attribute}-${f.id}`,
  };
  if (
    f.data.type === "reference" ||
    f.data.type === "ordered-reference" ||
    f.data.type === "spatial-reference"
  )
    indexes.vae = `${f.data.value}-${f.attribute}`;
  return { ...f, indexes };
}

export async function getClientGroup(
  db: PgTransaction<any, any, any>,
  clientGroupID: string,
): Promise<{ [clientID: string]: number }> {
  let data = await db
    .select()
    .from(replicache_clients)
    .where(driz.eq(replicache_clients.client_group, clientGroupID));
  if (!data) return {};
  return data.reduce(
    (acc, clientRecord) => {
      acc[clientRecord.client_id] = clientRecord.last_mutation;
      return acc;
    },
    {} as { [clientID: string]: number },
  );
}

export const scanIndex = (tx: ReadTransaction) => ({
  async eav<A extends Attribute>(entity: string, attribute: A | "") {
    return (
      (
        await tx
          .scan<Fact<A>>({ indexName: "eav", prefix: `${entity}-${attribute}` })
          // Hack rn because of the rich bluesky-post type
          .toArray()
      ).filter((f) => attribute === "" || f.attribute === attribute)
    );
  },
  async vae<
    A extends keyof FilterAttributes<{
      type: "reference" | "ordered-reference" | "spatial-reference";
    }>,
  >(entity: string, attribute: A) {
    return (
      await tx
        .scan<Fact<A>>({ indexName: "vae", prefix: `${entity}-${attribute}` })
        .toArray()
    ).filter((f) => f.attribute === attribute);
  },
});

// Every block's hooks read their facts out of the same initialFacts array
// until the first pull lands, so the array is grouped by entity and attribute
// once and shared by all of those reads.
const localIndexes = new WeakMap<Fact<any>[], Map<string, Fact<any>[]>>();
const indexFacts = (facts: Fact<any>[]) => {
  let index = new Map<string, Fact<any>[]>();
  for (let f of facts) {
    let key = `${f.entity}-${f.attribute}`;
    let list = index.get(key);
    if (list) list.push(f);
    else index.set(key, [f]);
  }
  return index;
};
export const scanIndexLocal = (initialFacts: Fact<any>[]) => {
  let index = localIndexes.get(initialFacts) ?? indexFacts(initialFacts);
  localIndexes.set(initialFacts, index);
  return {
    eav: <A extends Attribute>(entity: string, attribute: A) =>
      [...(index.get(`${entity}-${attribute}`) ?? [])] as SafeArray<Fact<A>>,
  };
};

// Base utility type for making types compatible with ReadonlyJSONObject
export type AsReadonlyJSONObject<T> = T & {
  [key: string]: undefined;
};

// Recursive utility type for nested objects
export type DeepAsReadonlyJSONValue<T> = T extends object
  ? T extends Array<infer U>
    ? ReadonlyArray<DeepAsReadonlyJSONValue<U>> // Handle arrays
    : AsReadonlyJSONObject<{
        [K in keyof T]: DeepAsReadonlyJSONValue<T[K]>;
      }>
  : T extends string | number | boolean | null
    ? T // Primitive types that already match ReadonlyJSONValue
    : never; // For other types that can't be converted
