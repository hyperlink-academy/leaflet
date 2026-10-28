import { cookies } from "next/headers";
import { leafletIcon } from "src/utils/leafletIcon";
import { supabaseServerClient } from "supabase/serverClient";

// Route segment config
export const revalidate = 0;
export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  let identity = (await cookies()).get("identity");
  let { data } = identity
    ? await supabaseServerClient
        .from("identities")
        .select("permission_tokens!identities_home_page_fkey(root_entity)")
        .eq("id", identity.value)
        .single()
    : { data: null };
  return leafletIcon(data?.permission_tokens?.root_entity, "no-cache");
}
