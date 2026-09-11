import * as driz from "drizzle-orm";
import { replicache_clients } from "drizzle/schema";
import { PgTransaction } from "drizzle-orm/pg-core";

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
