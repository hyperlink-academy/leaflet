import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as driz from "drizzle-orm";
import type { Fact } from ".";
import { replicache_clients } from "drizzle/schema";
import type {
  Attribute,
  FilterAttributes,
  AnyReferenceAttribute,
} from "./attributes";
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
  // Optimized: Use pre-computed AnyReferenceAttribute instead of FilterAttributes
  async vae<A extends AnyReferenceAttribute>(entity: string, attribute: A) {
    return (
      await tx
        .scan<Fact<A>>({ indexName: "vae", prefix: `${entity}-${attribute}` })
        .toArray()
    ).filter((f) => f.attribute === attribute);
  },
});

export const scanIndexLocal = (initialFacts: Fact<any>[]) => ({
  eav<A extends Attribute>(entity: string, attribute: A) {
    return initialFacts.filter(
      (f) => f.entity === entity && f.attribute === attribute,
    ) as SafeArray<Fact<A>>;
  },
});

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
