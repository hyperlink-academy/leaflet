import { makeRouter } from "../lib";
import { push } from "./push";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { pull } from "./pull";
import { getFactsFromHomeLeaflets } from "./getFactsFromHomeLeaflets";
import { Vercel } from "@vercel/sdk";
import {
  get_domain_status,
  get_leaflet_subdomain_status,
} from "./domain_routes";
import { get_leaflet_data } from "./get_leaflet_data";
import { get_publication_data } from "./get_publication_data";
import { search_publication_names } from "./search_publication_names";
import { search_publication_documents } from "./search_publication_documents";
import { get_profile_data } from "./get_profile_data";
import { get_user_recommendations } from "./get_user_recommendations";
import { get_hot_feed } from "./get_hot_feed";

let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

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
  get_leaflet_subdomain_status,
  get_leaflet_data,
  get_publication_data,
  search_publication_names,
  search_publication_documents,
  get_profile_data,
  get_user_recommendations,
  get_hot_feed,
];
export async function POST(
  req: Request,
  { params }: { params: Promise<{ command: string }> },
) {
  let p = await params;
  let router = makeRouter(Routes);
  return router(p.command, req, Env);
}
