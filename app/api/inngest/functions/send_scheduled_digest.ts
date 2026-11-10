import { inngest, events } from "../client";
import { sendScheduledDigest } from "src/digests/sendScheduled";

export const send_scheduled_digest = inngest.createFunction(
  {
    id: "send_scheduled_digest",
    retries: 3,
    triggers: [events.digestScheduled],
  },
  async ({ event, step }) =>
    step.run("send-digest", () => sendScheduledDigest(event.data)),
);
