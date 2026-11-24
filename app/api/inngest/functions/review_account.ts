import { inngest, events } from "../client";
import { pool } from "supabase/pool";
import { fetchProfiles, loadAccounts } from "src/review/load";
import {
  reviewAccount,
  saveLinks,
  saveReview,
  saveSubject,
} from "src/review/run";

// The review system's pass over one account, requested whenever the account
// publishes. Debounced so a burst of posts is judged once, together. The
// costly content.llm signal runs only with REVIEW_LLM=1; without it an
// account the cheap signals can't settle is recorded as pending.
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
      const review = await reviewAccount(
        account,
        { db: pool, now: new Date() },
        { costly: process.env.REVIEW_LLM === "1" },
      );
      await saveReview(pool, account, review, `${cause}-${event.id}`);
      return review.decision;
    });
  },
);
