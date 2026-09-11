import { createClient } from "@supabase/supabase-js";
import type { Database } from "supabase/database.types";
export const supabaseServerClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    // Reads must always be fresh; don't depend on a page's fetchCache export.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  },
);
