import { inngest, events } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import type { RunStep } from "src/emailPosts/broadcast";
import { emailOnlyIneligibleReason } from "src/emailPosts/eligibility";
import { loadEmailPostRecipients, sendEmailPost } from "src/emailPosts/send";
import type { EmailPostRow } from "src/emailPosts/types";

// Sends a scheduled email-only post at its send_at. Every save bumps the
// post's revision and requests a new run, so a run (possibly asleep for weeks)
// sends only if its revision is still current when it wakes; a canceled post's
// row is gone, which stops it the same way.
export const send_email_post = inngest.createFunction(
  {
    id: "send_email_post",
    onFailure: async ({ event, error }) => {
      const { email_post_id } = event.data.event.data;
      await supabaseServerClient
        .from("publication_email_posts")
        .update({
          status: "failed",
          error: String(error?.message ?? error).slice(0, 500),
        })
        .eq("id", email_post_id)
        .eq("status", "sending");
    },
    triggers: [events.newsletterEmailPostSendRequested],
  },
  async ({ event, step }) => {
    const { email_post_id, revision } = event.data;
    const run: RunStep = (id, fn) => step.run(id, fn) as Promise<any>;

    const scheduled = await run("load-schedule", async () => {
      const { data } = await supabaseServerClient
        .from("publication_email_posts")
        .select("publication, status, revision, send_at")
        .eq("id", email_post_id)
        .maybeSingle();
      return data;
    });
    if (
      !scheduled ||
      scheduled.revision !== revision ||
      scheduled.status !== "scheduled"
    )
      return { skipped: "superseded" };

    if (scheduled.send_at && new Date(scheduled.send_at) > new Date())
      await step.sleepUntil("wait-for-send-at", scheduled.send_at);

    const post = await run("claim", async (): Promise<EmailPostRow | null> => {
      const ineligible = await emailOnlyIneligibleReason(scheduled.publication);
      const { data: claimed } = await supabaseServerClient
        .from("publication_email_posts")
        .update(
          ineligible
            ? { status: "paused", error: ineligible }
            : { status: "sending", error: null },
        )
        .eq("id", email_post_id)
        .eq("revision", revision)
        .eq("status", "scheduled")
        .select()
        .maybeSingle();
      return ineligible ? null : claimed;
    });
    if (!post) return { skipped: "superseded_or_paused" };

    const recipients = await run("snapshot-subscribers", async () => {
      const subs = await loadEmailPostRecipients(post);
      await supabaseServerClient
        .from("publication_email_posts")
        .update({ subscriber_count: subs.length })
        .eq("id", post.id);
      return subs;
    });

    const failure =
      recipients.length > 0 ? await sendEmailPost(run, post, recipients) : null;

    await run("finalize", async () => {
      await supabaseServerClient
        .from("publication_email_posts")
        .update(
          failure
            ? { status: "failed", error: failure.error }
            : { status: "sent", sent_at: new Date().toISOString() },
        )
        .eq("id", post.id);
    });
    return failure ?? { sent: recipients.length };
  },
);

// Sends a publication's on-subscribe emails to a reader who just subscribed or
// became a paying member. A paid join fires both, and can confirm the email
// subscription before payment lands, so the debounce collapses them into one
// run that starts once the membership row exists and a free/paid audience can
// be decided. The post_sent event log dedupes anything later (e.g. a
// membership recovery).
export const send_email_post_on_subscribe = inngest.createFunction(
  {
    id: "send_email_post_on_subscribe",
    debounce: {
      key: "event.data.publication_uri + '|' + event.data.identity_id",
      period: "2m",
    },
    triggers: [events.newsletterSubscriberJoined],
  },
  async ({ event, step }) => {
    const { publication_uri, identity_id } = event.data;
    const run: RunStep = (id, fn) => step.run(id, fn) as Promise<any>;

    const posts = await run("load-posts", async () => {
      const { data } = await supabaseServerClient
        .from("publication_email_posts")
        .select()
        .eq("publication", publication_uri)
        .eq("send_mode", "on_subscribe")
        .eq("status", "active");
      if (!data?.length) return [];
      const ineligible = await emailOnlyIneligibleReason(publication_uri);
      if (!ineligible) return data;
      await supabaseServerClient
        .from("publication_email_posts")
        .update({ status: "paused", error: ineligible })
        .in(
          "id",
          data.map((p) => p.id),
        )
        .eq("status", "active");
      return [];
    });

    // A free and a paid email can both be active; the audience filter picks
    // which (if either) this reader gets.
    const sent: Record<string, number | string> = {};
    for (const post of posts) {
      const postRun: RunStep = (id, fn) => run(`${post.id}:${id}`, fn);
      const recipients = await postRun("resolve-subscriber", () =>
        loadEmailPostRecipients(post, identity_id),
      );
      if (recipients.length === 0) continue;

      const failure = await sendEmailPost(postRun, post, recipients);
      if (failure) {
        sent[post.id] = failure.error;
        continue;
      }

      await postRun("count-recipients", async () => {
        const { count } = await supabaseServerClient
          .from("publication_email_subscriber_events")
          .select("*", { count: "exact", head: true })
          .eq("publication", publication_uri)
          .eq("event_type", "post_sent")
          .eq("metadata->>email_post", post.id);
        await supabaseServerClient
          .from("publication_email_posts")
          .update({ subscriber_count: count ?? 0 })
          .eq("id", post.id);
      });
      sent[post.id] = recipients.length;
    }
    return { sent };
  },
);
