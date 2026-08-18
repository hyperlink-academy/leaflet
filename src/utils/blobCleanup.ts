import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "supabase/database.types";

// Image facts bake the object's full public URL into data.src, sometimes with
// a cache-busting query string; the storage object name is the last path
// segment.
export function storagePathFromSrc(src: string) {
  return src.split("?")[0].split("/").at(-1)!;
}

export async function enqueueBlobCleanup(
  supabase: SupabaseClient<Database>,
  src: string,
) {
  await supabase
    .from("blob_cleanup_queue")
    .upsert(
      { path: storagePathFromSrc(src) },
      { onConflict: "path", ignoreDuplicates: true },
    )
    .throwOnError();
}
