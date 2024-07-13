import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as driz from "drizzle-orm";
import { Fact } from ".";
import { replicache_clients } from "drizzle/schema";
import { Attributes } from "./attributes";
import { ReadTransaction, WriteTransaction } from "replicache";

export function FactWithIndexes(f: Fact<keyof typeof Attributes>) {
  let indexes: {
    eav: string;
    aev: string;
    vae?: string;
  } = {
    eav: `${f.entity}-${f.attribute}-${f.id}`,
    aev: `${f.attribute}-${f.entity}-${f.id}`,
  };
  if (f.data.type === "reference" || f.data.type === "ordered-reference")
    indexes.vae = `${f.data.value}-${f.attribute}`;
  return { ...f, indexes };
}

export async function getClientGroup(
  db: PostgresJsDatabase,
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
  async eav<A extends keyof typeof Attributes>(entity: string, attribute: A) {
    return (
      await tx
        .scan<Fact<A>>({ indexName: "eav", prefix: `${entity}-${attribute}` })
        .toArray()
    ).filter((f) => f.attribute === attribute);
  },
});

export const scanIndexLocal = (initialFacts: Fact<any>[]) => ({
  eav<A extends keyof typeof Attributes>(entity: string, attribute: A) {
    return initialFacts.filter(
      (f) => f.entity === entity && f.attribute === attribute,
    ) as Fact<A>[];
  },
});
