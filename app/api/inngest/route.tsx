import { serve } from "inngest/next";
import { inngest } from "app/api/inngest/client";
import { index_post_mention } from "./functions/index_post_mention";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [index_post_mention],
});
