import Client from "ioredis";

let client: Client | null | undefined;

// Redis only exists in production; every caller has to work without it, so this
// returns null rather than throwing on a dev machine.
export function getRedis(): Client | null {
  if (client === undefined) {
    client =
      process.env.REDIS_URL && process.env.NODE_ENV === "production"
        ? new Client(process.env.REDIS_URL)
        : null;
  }
  return client;
}
