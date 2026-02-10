import { inngest } from "app/api/inngest/client";

async function triggerCleanup() {
  console.log("Triggering OAuth session cleanup...");

  try {
    const result = await inngest.send({
      name: "user/cleanup-expired-oauth-sessions",
      data: {},
    });
    console.log("Event sent:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error sending event:", error);
  }
}

triggerCleanup();
