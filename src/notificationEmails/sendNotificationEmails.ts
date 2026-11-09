import type { NotificationEmailRequest } from "./types";
import { sendCommentEmails } from "./comments";

// Each notification type owns its recipient lookup, template, and delivery tracking.
export async function sendNotificationEmails(
  request: NotificationEmailRequest,
) {
  switch (request.type) {
    case "comments":
      return sendCommentEmails(request.subjectUri);
    default:
      throw new Error("Unsupported notification email type");
  }
}
