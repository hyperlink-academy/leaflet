import { inngest, events } from "../client";
import {
  loadReviewInput,
  classifyPublication,
  recordVerdict,
} from "src/publicationReview/classify";

// Automated spam review of a queued publication, requested on every publish
// while the publication is still in the automated flow. Debounced so a burst
// of posts is judged once, together.
export const review_publication = inngest.createFunction(
  {
    id: "review_publication",
    debounce: { key: "event.data.publication_uri", period: "1m" },
    triggers: [events.publicationReviewRequested],
  },
  async ({ event, step }) => {
    const { publication_uri } = event.data;
    const input = await step.run("load", () =>
      loadReviewInput(publication_uri),
    );
    if (!input) return { skipped: true };
    const verdict = await step.run("classify", () =>
      classifyPublication(input),
    );
    await step.run("record", () => recordVerdict(publication_uri, verdict));
    return verdict;
  },
);
