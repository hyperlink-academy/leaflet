import { inngest } from "app/api/inngest/client";

// Asks the review system to look at an account again because something about
// it changed. Never throws: a lost request costs one dry-run observation, and
// must not fail the publish that caused it.
export async function requestAccountReview(did: string, cause: string) {
  try {
    await inngest.send({
      name: "review/account.touched",
      data: { did, cause },
    });
  } catch (e) {
    console.error("[review] request failed:", e);
  }
}
