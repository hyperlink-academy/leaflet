import { createServerClient } from "@supabase/ssr";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextRequest } from "next/server";
import postgres from "postgres";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { Database } from "supabase/database.types";
import { v7 } from "uuid";

import {
  entities,
  permission_tokens,
  permission_token_rights,
  entity_sets,
  facts,
} from "drizzle/schema";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createNewLeafletFromTemplate } from "actions/createNewLeafletFromTemplate";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function GET(
  request: NextRequest,
  { params }: { params: { template_id: string } },
) {
  return createNewLeafletFromTemplate(params.template_id);
}
