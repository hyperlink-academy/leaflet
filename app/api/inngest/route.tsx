import { serve } from "inngest/next";
import { inngest } from "app/api/inngest/client";
import { index_post_mention } from "./functions/index_post_mention";
import { come_online } from "./functions/come_online";
import { batched_update_profiles } from "./functions/batched_update_profiles";
import { index_follows } from "./functions/index_follows";
import { migrate_user_to_standard } from "./functions/migrate_user_to_standard";
import {
  cleanup_expired_oauth_sessions,
  check_oauth_session,
} from "./functions/cleanup_expired_oauth_sessions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    index_post_mention,
    come_online,
    batched_update_profiles,
    index_follows,
    migrate_user_to_standard,
    cleanup_expired_oauth_sessions,
    check_oauth_session,
  ],
});
