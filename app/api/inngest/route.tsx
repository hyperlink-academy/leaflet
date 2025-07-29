import { serve } from "inngest/next";
import { inngest } from "app/api/inngest/client";
import { index_post_mention } from "./functions/index_post_mention";
import { come_online } from "./functions/come_online";
import { batched_update_profiles } from "./functions/batched_update_profiles";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [index_post_mention, come_online, batched_update_profiles],
});
