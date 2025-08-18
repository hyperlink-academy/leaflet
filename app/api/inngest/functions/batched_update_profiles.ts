import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";

export const batched_update_profiles = inngest.createFunction(
  {
    id: "batched_update_profiles",
    batchEvents: {
      maxSize: 100,
      timeout: "10s",
    },
  },
  { event: "appview/profile-update" },
  async ({ events, step }) => {
    let existingProfiles = await supabaseServerClient
      .from("bsky_profiles")
      .select("did")
      .in(
        "did",
        events.map((event) => event.data.did),
      );
    if (!existingProfiles.data) return { error: existingProfiles.error };

    const profileUpdates = events.map((event) => ({
      did: event.data.did,
      record: event.data.record,
    }));

    let { error } = await supabaseServerClient
      .from("bsky_profiles")
      .upsert(profileUpdates);
    return {
      done: true,
      profiles_updated: existingProfiles.data.length,
      error,
    };
  },
);
