import { inngest, events } from "../client";
import {
  advanceDigestSchedule,
  digestScheduleEvent,
  isCurrentDigestSchedule,
} from "src/digests/schedule";
import { sendScheduledDigest } from "src/digests/sendScheduled";

// Queue the next period before sending, so empty periods and email failures
// cannot break the chain. Each step resumes safely after a restart or retry.
export const send_scheduled_digest = inngest.createFunction(
  {
    id: "send_scheduled_digest",
    retries: 3,
    triggers: [events.digestScheduled],
  },
  async ({ event, step }) => {
    const schedule = event.data;
    if (
      !(await step.run("check-schedule", () =>
        isCurrentDigestSchedule(schedule),
      ))
    )
      return { skipped: "superseded" };
    await step.sleepUntil("wait-for-digest", schedule.due);
    const next = await step.run("advance-schedule", () =>
      advanceDigestSchedule(schedule),
    );
    if (!next) return { skipped: "superseded" };
    await step.sendEvent("queue-next-digest", digestScheduleEvent(next));
    return step.run("send-digest", () => sendScheduledDigest(schedule));
  },
);
