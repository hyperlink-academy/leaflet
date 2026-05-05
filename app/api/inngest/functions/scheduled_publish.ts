import { inngest, events } from "../client";
import { TID } from "@atproto/common";
import { restoreOAuthSession } from "src/atproto-oauth";
import { publishToPublicationWithSession } from "actions/publishToPublication";
import { publishPostToBskyWithSession } from "app/[leaflet_id]/publish/publishBskyPost";
import type { ScheduledPublishData } from "src/utils/scheduledPublish";
import {
  loadScheduleRow,
  loadScheduledAt,
  updateScheduleColumns,
} from "actions/scheduledPublishDb";

type ScheduleRow = {
  scheduled_publish_at: string;
  scheduled_publish_data: ScheduledPublishData;
  title: string;
  description: string;
  tags: string[] | null;
  cover_image: string | null;
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  } | null;
  root_entity: string;
};

async function loadSchedule(
  leaflet_id: string,
  publication_uri: string | undefined,
): Promise<ScheduleRow | null> {
  const data = await loadScheduleRow(leaflet_id, publication_uri);
  if (!data || !data.scheduled_publish_at || !data.scheduled_publish_data) {
    return null;
  }
  const root_entity = (data.permission_tokens as { root_entity: string } | null)
    ?.root_entity;
  if (!root_entity) return null;
  return {
    scheduled_publish_at: data.scheduled_publish_at,
    scheduled_publish_data:
      data.scheduled_publish_data as unknown as ScheduledPublishData,
    title: data.title,
    description: data.description,
    tags: data.tags,
    cover_image: data.cover_image,
    preferences: data.preferences as ScheduleRow["preferences"],
    root_entity,
  };
}

export const scheduled_publish = inngest.createFunction(
  {
    id: "scheduled-publish",
    concurrency: [{ key: "event.data.leaflet_id", limit: 1 }],
    onFailure: async ({ event }) => {
      // Exhausted step retries — clear the schedule columns so the row
      // doesn't sit with stale scheduled_publish_data forever and the UI
      // stops advertising the post as scheduled. The error itself surfaces
      // in the Inngest dashboard.
      const { leaflet_id, publication_uri } = event.data.event.data;
      await updateScheduleColumns(leaflet_id, publication_uri, {
        scheduled_publish_at: null,
        scheduled_publish_data: null,
      });
    },
    triggers: [events.postScheduledPublish],
  },
  async ({ event, step }) => {
    const { leaflet_id, publication_uri } = event.data;

    const scheduledAt = await step.run("load-scheduled-at", async () =>
      loadScheduledAt(leaflet_id, publication_uri),
    );
    if (!scheduledAt) return { cancelled: true };

    await step.sleepUntil("wait-for-scheduled-time", new Date(scheduledAt));

    // The user may have cancelled or rescheduled while we slept. A cancel
    // nulls the column; a reschedule sends a new event (handled by a separate
    // run that sleeps to the new time) and updates this column, so an exact
    // scheduledAt mismatch means this run is stale and must exit.
    const current = await step.run("verify-schedule", async () =>
      loadSchedule(leaflet_id, publication_uri),
    );
    if (!current || current.scheduled_publish_at !== scheduledAt) {
      return { cancelled: true };
    }

    const data = current.scheduled_publish_data;

    const publishResult = await step.run("publish", async () => {
      const sessionResult = await restoreOAuthSession(data.did);
      if (!sessionResult.ok) {
        throw new Error(
          `OAuth restore failed for scheduled publish: ${sessionResult.error.message}`,
        );
      }
      const result = await publishToPublicationWithSession({
        root_entity: current.root_entity,
        publication_uri,
        leaflet_id,
        title: current.title,
        description: current.description,
        tags: current.tags ?? undefined,
        cover_image: current.cover_image,
        publishedAt: current.scheduled_publish_at,
        postPreferences: current.preferences,
        credentialSession: sessionResult.value,
        did: data.did,
      });
      if (!result.success) {
        throw new Error(
          `Scheduled publish failed: ${result.error.message}`,
        );
      }
      return {
        rkey: result.rkey,
        // Strip the BlobRef instances out so the value is JSON-serializable
        // for Inngest step memoization.
        record: JSON.parse(JSON.stringify(result.record)),
      };
    });

    if (data.shareState.bluesky) {
      // Mint the bsky post rkey in its own memoized step so retries of the
      // post-to-bsky step (e.g. transient putRecord/supabase failure after the
      // post is already created) reuse the same rkey instead of creating a
      // second public Bluesky post.
      const bskyPostRkey = await step.run("bsky-post-rkey", () =>
        TID.nextStr(),
      );
      await step.run("post-to-bsky", async () => {
        const sessionResult = await restoreOAuthSession(data.did);
        if (!sessionResult.ok) {
          throw new Error(
            `OAuth restore failed for bsky post: ${sessionResult.error.message}`,
          );
        }
        const post_url =
          data.publicationUrl
            ? `${data.publicationUrl.replace(/\/$/, "")}/${publishResult.rkey}`
            : `https://leaflet.pub/p/${data.did}/${publishResult.rkey}`;
        const bskyResult = await publishPostToBskyWithSession({
          credentialSession: sessionResult.value,
          did: data.did,
          text: data.bskyText ?? "",
          facets: data.bskyFacets ?? [],
          title: current.title,
          description: current.description,
          url: post_url,
          document_record: publishResult.record,
          rkey: publishResult.rkey,
          bskyPostRkey,
        });
        if (!bskyResult.success) {
          throw new Error(
            `Bsky post failed: ${bskyResult.error.message}`,
          );
        }
      });
    }

    await step.run("clear-schedule", async () => {
      await updateScheduleColumns(leaflet_id, publication_uri, {
        scheduled_publish_at: null,
        scheduled_publish_data: null,
      });
    });

    return { success: true, rkey: publishResult.rkey };
  },
);
