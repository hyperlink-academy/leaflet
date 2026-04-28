"use server";

import { AppBskyRichtextFacet } from "@atproto/api";
import { getIdentityData } from "actions/getIdentityData";
import { inngest } from "app/api/inngest/client";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { Result, Ok, Err } from "src/result";
import {
  ScheduleUpdates,
  updateScheduleColumns,
} from "actions/scheduledPublishDb";
import type { ScheduledPublishData } from "src/utils/scheduledPublish";

export type SchedulePostError =
  | { type: "not_authenticated" }
  | { type: "not_pro" }
  | { type: "invalid_schedule" }
  | { type: "not_found" };

export async function schedulePost(args: {
  leaflet_id: string;
  publication_uri?: string;
  scheduled_publish_at: string;
  title?: string;
  description?: string;
  tags?: string[];
  cover_image?: string | null;
  preferences?: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  } | null;
  shareState: ScheduledPublishData["shareState"];
  bskyText?: string;
  bskyFacets?: AppBskyRichtextFacet.Main[];
  publicationUrl?: string;
}): Promise<Result<{ scheduled_publish_at: string }, SchedulePostError>> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return Err({ type: "not_authenticated" });

  if (!identity.entitlements?.can_schedule_posts) {
    return Err({ type: "not_found" });
  }

  if (!identity.entitlements?.publication_analytics) {
    return Err({ type: "not_pro" });
  }

  const scheduledAt = new Date(args.scheduled_publish_at);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return Err({ type: "invalid_schedule" });
  }

  const data: ScheduledPublishData = {
    shareState: args.shareState,
    bskyText: args.bskyText,
    bskyFacets: args.bskyFacets,
    did: identity.atp_did,
    publicationUrl: args.publicationUrl,
  };

  const updates: ScheduleUpdates = {
    scheduled_publish_at: scheduledAt.toISOString(),
    scheduled_publish_data: data as unknown as Json,
  };
  if (args.title !== undefined) updates.title = args.title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.tags !== undefined) updates.tags = args.tags;
  if (args.cover_image !== undefined) updates.cover_image = args.cover_image;
  if (args.preferences !== undefined)
    updates.preferences = args.preferences as unknown as Json;

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
    updates,
  );
  if (!found) return Err({ type: "not_found" });

  try {
    await inngest.send({
      name: "post/scheduled-publish",
      data: {
        leaflet_id: args.leaflet_id,
        publication_uri: args.publication_uri,
      },
    });
  } catch (e) {
    console.log(e);
  }

  return Ok({ scheduled_publish_at: scheduledAt.toISOString() });
}
