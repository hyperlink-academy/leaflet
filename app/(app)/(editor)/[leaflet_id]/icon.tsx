import { leafletIcon } from "src/utils/leafletIcon";
import { isUuid } from "src/utils/isUuid";
import { supabaseServerClient } from "supabase/serverClient";

// Route segment config
export const revalidate = 0;
export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon(props: {
  params: Promise<{ leaflet_id: string }>;
}) {
  let leaflet_id = (await props.params).leaflet_id;
  let { data } = isUuid(leaflet_id)
    ? await supabaseServerClient
        .from("permission_tokens")
        .select("root_entity")
        .eq("id", leaflet_id)
        .single()
    : { data: null };
  // Browsers request the favicon on nearly every page load. The icon only
  // changes with the leaflet's theme, so let caches hold it and pick up theme
  // edits within the hour.
  return leafletIcon(
    data?.root_entity,
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
}
