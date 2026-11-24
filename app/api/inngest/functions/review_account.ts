import { inngest, events } from "../client";
import { pool } from "supabase/pool";
import { fetchProfiles, loadAccounts } from "src/review/load";
import { forgetBlockedMemo } from "src/review/blocked";
import { dropCachedPages } from "src/review/dropCachedPages";
import {
  reviewAccount,
  saveLinks,
  saveReview,
  saveSubject,
} from "src/review/run";

// The review system's pass over one account, requested whenever the account
// publishes. Debounced so a burst of posts is judged once, together. The
// costly content.llm signal runs unless REVIEW_LLM=0. If it is off or the
// model call fails, an account the cheap signals can't settle is recorded as
// unjudged, so its cheap signals are kept and the next review finishes it.
export const review_account = inngest.createFunction(
  {
    id: "review_account",
    debounce: { key: "event.data.did", period: "1m" },
    triggers: [events.reviewAccountTouched],
  },
  async ({ event, step }) => {
    const { did, cause } = event.data;
    return step.run("review", async () => {
      const [account] = await loadAccounts(pool, [did]);
      if (!account || account.documents.length === 0) return { skipped: true };
      account.profile = (await fetchProfiles([did])).get(did) ?? null;
      await saveLinks(pool, account);
      await saveSubject(pool, account);
      const ctx = { db: pool, now: new Date() };
      const review = await reviewAccount(account, ctx, {
        costly: process.env.REVIEW_LLM !== "0",
      }).catch((e) => {
        console.error("[review] model signal failed:", did, e);
        return reviewAccount(account, ctx, { costly: false });
      });
      const { blocked } = await saveReview(
        pool,
        account,
        review,
        `${cause}-${event.id}`,
      );
      if (blocked) {
        forgetBlockedMemo([did]);
        await dropCachedPages(pool, [did]).catch((e) =>
          console.error("[review] cache drop failed:", did, e),
        );
      }
      return { ...review.decision, blocked };
    });
  },
);
