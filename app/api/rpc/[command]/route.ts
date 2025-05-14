import { drizzle } from "drizzle-orm/postgres-js";
import { makeRouter } from "../lib";
import { push } from "./push";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { pull } from "./pull";
import { getFactsFromHomeLeaflets } from "./getFactsFromHomeLeaflets";
import { Vercel } from "@vercel/sdk";
import { get_domain_status } from "./domain_routes";
import { get_leaflet_data } from "./get_leaflet_data";

const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
const db = drizzle(client);

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});
const Env = {
  supabase,
  vercel,
};
export type Env = typeof Env;
export type Routes = typeof Routes;
let Routes = [
  push,
  pull,
  getFactsFromHomeLeaflets,
  get_domain_status,
  get_leaflet_data,
];
export async function POST(
  req: Request,
  { params }: { params: Promise<{ command: string }> },
) {
  let p = await params;
  let router = makeRouter(Routes);
  return router(p.command, req, Env);
}
