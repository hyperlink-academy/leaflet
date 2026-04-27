"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Result, Ok, Err } from "src/result";
import { updateScheduleColumns } from "actions/scheduledPublishDb";

export type CancelScheduledPostError =
  | { type: "not_authenticated" }
  | { type: "not_found" };

export async function cancelScheduledPost(args: {
  leaflet_id: string;
  publication_uri?: string;
}): Promise<Result<{ cancelled: true }, CancelScheduledPostError>> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return Err({ type: "not_authenticated" });

  if (args.publication_uri) {
    const { data: pub } = await supabaseServerClient
      .from("publications")
      .select("identity_did")
      .eq("uri", args.publication_uri)
      .single();
    if (!pub || pub.identity_did !== identity.atp_did) {
      return Err({ type: "not_found" });
    }
  }

  const { found } = await updateScheduleColumns(
    args.leaflet_id,
    args.publication_uri,
    { scheduled_publish_at: null, scheduled_publish_data: null },
  );
  if (!found) return Err({ type: "not_found" });

  return Ok({ cancelled: true });
}
