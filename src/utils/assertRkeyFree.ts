import { supabaseServerClient } from "supabase/serverClient";

// A published document already at this record key (either namespace) would
// be shadowed or clobbered by a new one.
export async function assertRkeyFree(did: string, rkey: string) {
  let { data: existing } = await supabaseServerClient
    .from("documents")
    .select("uri")
    .in("uri", [
      `at://${did}/site.standard.document/${rkey}`,
      `at://${did}/pub.leaflet.document/${rkey}`,
    ])
    .throwOnError();
  if (existing && existing.length > 0)
    throw new Error(`A post is already published at /${rkey}`);
}
