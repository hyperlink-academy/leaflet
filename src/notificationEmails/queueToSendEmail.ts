import { createHash } from "node:crypto";
import { inngest } from "app/api/inngest/client";
import type { NotificationEmailRequest } from "./types";

// Queue delivery outside the publishing request; repeated requests share an id.
export async function queueToSendEmail(request: NotificationEmailRequest) {
  try {
    const hash = createHash("sha256")
      .update(`${request.type}:${request.subjectUri}`)
      .digest("hex");
    await inngest.send({
      id: `notification-email-${hash}`,
      name: "notifications/email.requested",
      data: request,
    });
  } catch (error) {
    // Publishing must still succeed when the email queue is unavailable.
    console.error("[notification-email] could not queue", { request, error });
  }
}
