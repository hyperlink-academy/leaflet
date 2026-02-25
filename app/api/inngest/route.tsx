import { serve } from "inngest/next";
import { inngest } from "app/api/inngest/client";
import { index_post_mention } from "./functions/index_post_mention";
import { come_online } from "./functions/come_online";
import { batched_update_profiles } from "./functions/batched_update_profiles";
import { index_follows } from "./functions/index_follows";
import { migrate_user_to_standard } from "./functions/migrate_user_to_standard";
import { fix_standard_document_publications } from "./functions/fix_standard_document_publications";
import { fix_incorrect_site_values } from "./functions/fix_incorrect_site_values";
import { fix_standard_document_postref } from "./functions/fix_standard_document_postref";
import {
  cleanup_expired_oauth_sessions,
  check_oauth_session,
} from "./functions/cleanup_expired_oauth_sessions";
import { write_records_to_pds } from "./functions/write_records_to_pds";
import { stripe_handle_checkout_completed } from "./functions/stripe_handle_checkout_completed";
import { stripe_handle_subscription_updated } from "./functions/stripe_handle_subscription_updated";
import { stripe_handle_subscription_deleted } from "./functions/stripe_handle_subscription_deleted";
import { stripe_handle_invoice_payment_failed } from "./functions/stripe_handle_invoice_payment_failed";
import { sync_document_metadata } from "./functions/sync_document_metadata";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    index_post_mention,
    come_online,
    batched_update_profiles,
    index_follows,
    migrate_user_to_standard,
    fix_standard_document_publications,
    fix_incorrect_site_values,
    fix_standard_document_postref,
    cleanup_expired_oauth_sessions,
    check_oauth_session,
    write_records_to_pds,
    stripe_handle_checkout_completed,
    stripe_handle_subscription_updated,
    stripe_handle_subscription_deleted,
    stripe_handle_invoice_payment_failed,
    sync_document_metadata,
  ],
});
