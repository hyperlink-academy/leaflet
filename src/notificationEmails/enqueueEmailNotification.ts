import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "supabase/database.types";
import { inngest } from "app/api/inngest/client";
import type { NotificationEmailRequest } from "./types";

// Each notification type says whether anyone could be emailed, so requests
// nobody asked for never become queue events. The sender rechecks recipients.
async function hasRecipients(
  request: NotificationEmailRequest,
  db: SupabaseClient<Database>,
) {
  switch (request.type) {
    case "comments": {
      const { data, error } = await db.rpc("has_comment_email_recipients", {
        p_comment_uri: request.subjectUri,
      });
      // If the check itself fails, queue anyway rather than drop an email.
      return error || data !== false;
    }
  }
}

// Queue delivery outside the publishing request; repeated requests share an id.
export async function enqueueEmailNotification(
  request: NotificationEmailRequest,
  db: SupabaseClient<Database>,
) {
  try {
    if (!(await hasRecipients(request, db))) return;
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
