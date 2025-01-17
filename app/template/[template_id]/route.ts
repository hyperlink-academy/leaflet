import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { Database } from "supabase/database.types";
import { createNewLeafletFromTemplate } from "actions/createNewLeafletFromTemplate";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function GET(
  request: NextRequest,
  { params }: { params: { template_id: string } },
) {
  await createNewLeafletFromTemplate(params.template_id, true);
}
