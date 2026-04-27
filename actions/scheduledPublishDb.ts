import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";

export type ScheduleUpdates = {
  scheduled_publish_at: string | null;
  scheduled_publish_data: Json | null;
  title?: string;
  description?: string;
  tags?: string[];
  cover_image?: string | null;
  preferences?: Json;
};

export async function updateScheduleColumns(
  leaflet_id: string,
  publication_uri: string | undefined,
  updates: ScheduleUpdates,
): Promise<{ found: boolean }> {
  if (publication_uri) {
    const { data } = await supabaseServerClient
      .from("leaflets_in_publications")
      .update(updates)
      .eq("leaflet", leaflet_id)
      .eq("publication", publication_uri)
      .select("leaflet");
    return { found: !!data && data.length > 0 };
  }
  const { data } = await supabaseServerClient
    .from("leaflets_to_documents")
    .update(updates)
    .eq("leaflet", leaflet_id)
    .select("leaflet");
  return { found: !!data && data.length > 0 };
}

const SCHEDULE_COLUMNS =
  "scheduled_publish_at, scheduled_publish_data, title, description, tags, cover_image, preferences, permission_tokens(root_entity)";

export async function loadScheduleRow(
  leaflet_id: string,
  publication_uri: string | undefined,
) {
  if (publication_uri) {
    const { data } = await supabaseServerClient
      .from("leaflets_in_publications")
      .select(SCHEDULE_COLUMNS)
      .eq("leaflet", leaflet_id)
      .eq("publication", publication_uri)
      .maybeSingle();
    return data;
  }
  const { data } = await supabaseServerClient
    .from("leaflets_to_documents")
    .select(SCHEDULE_COLUMNS)
    .eq("leaflet", leaflet_id)
    .maybeSingle();
  return data;
}

export async function loadScheduledAt(
  leaflet_id: string,
  publication_uri: string | undefined,
): Promise<string | null> {
  if (publication_uri) {
    const { data } = await supabaseServerClient
      .from("leaflets_in_publications")
      .select("scheduled_publish_at")
      .eq("leaflet", leaflet_id)
      .eq("publication", publication_uri)
      .maybeSingle();
    return data?.scheduled_publish_at ?? null;
  }
  const { data } = await supabaseServerClient
    .from("leaflets_to_documents")
    .select("scheduled_publish_at")
    .eq("leaflet", leaflet_id)
    .maybeSingle();
  return data?.scheduled_publish_at ?? null;
}
