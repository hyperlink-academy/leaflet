import { cron } from "inngest";
import { inngest } from "../client";
import {
  advanceDigestSchedules,
  digestScheduleEvent,
  findDueDigests,
  initializeDigestSchedules,
} from "src/digests/schedule";

// Bounds one fan-out; anything left over is still due and goes out on the next run.
const BATCH_SIZE = 500;

// Events go out before the schedule advances, so a crash in between re-queues
// the same period under the same event id instead of dropping it.
export const queue_due_digests = inngest.createFunction(
  { id: "queue_due_digests", triggers: [cron("0 * * * *")] },
  async ({ step }) => {
    await step.run("initialize-schedules", () => initializeDigestSchedules());
    const due = await step.run("find-due", () => findDueDigests(BATCH_SIZE));
    if (!due.length) return { queued: 0 };
    await step.sendEvent(
      "queue-digests",
      due.map(({ identity, publication, due }) =>
        digestScheduleEvent({ identity, publication, due }),
      ),
    );
    await step.run("advance-schedules", () => advanceDigestSchedules(due));
    return { queued: due.length };
  },
);
