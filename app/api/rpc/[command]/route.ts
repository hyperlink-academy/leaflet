import { drizzle } from "drizzle-orm/postgres-js";
import { makeRouter } from "../lib";
import { push } from "./push";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { pull } from "./pull";
import { getFactsFromHomeLeaflets } from "./getFactsFromHomeLeaflets";

const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
const db = drizzle(client);

const Env = {
  supabase,
};
export type Env = typeof Env;
export type Routes = typeof Routes;
let Routes = [push, pull, getFactsFromHomeLeaflets];
export async function POST(
  req: Request,
  { params }: { params: { command: string } },
) {
  let router = makeRouter(Routes);
  return router(params.command, req, Env);
}
