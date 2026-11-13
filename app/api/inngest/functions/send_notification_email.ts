import { inngest, events } from "../client";
import { sendNotificationEmails } from "src/notificationEmails/sendNotificationEmails";

// Background worker for queued emails: serialize each subject and retry failures.
export const send_notification_email = inngest.createFunction(
  {
    id: "send_notification_email",
    retries: 3,
    triggers: [events.notificationEmailRequested],
    concurrency: { limit: 1, key: "event.data.subjectUri" },
  },
  async ({ event, step }) =>
    step.run("send-notification-emails", () =>
      sendNotificationEmails(event.data),
    ),
);
