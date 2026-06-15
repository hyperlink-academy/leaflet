// Shared error copy for the email-subscribe flow. Used by SubscribeInput
// (SubscribeButton.tsx) and EmailButton (EmailSubscribe.tsx) so the two entry
// points surface identical messaging. The keys are a superset of both the
// request and confirm error unions returned by actions/publications/subscribeEmail.
export type SubscribeError =
  | "invalid_email"
  | "newsletter_disabled"
  | "email_send_failed"
  | "subscriber_not_found"
  | "invalid_code"
  | "database_error"
  | "suppressed_spam_complaint"
  | "suppression_delete_failed"
  | "link_invalid_state"
  | "email_belongs_to_other_account";

export const SUBSCRIBE_ERROR_MESSAGES: Record<SubscribeError, string> = {
  invalid_email: "Please enter a valid email address.",
  newsletter_disabled: "This publication isn't accepting email subscriptions.",
  email_send_failed: "We couldn't send the confirmation email. Try again.",
  subscriber_not_found: "No pending subscription. Start over.",
  invalid_code: "That code didn't match. Try again.",
  database_error: "Something went wrong. Try again.",
  suppressed_spam_complaint:
    "This address was previously marked as spam and can't be resubscribed. Contact the publication to resolve.",
  suppression_delete_failed:
    "We couldn't clear a prior delivery issue on this address. Try again later.",
  link_invalid_state:
    "Couldn't link this email to your account. Try logging out and subscribing again.",
  email_belongs_to_other_account:
    "This email is already linked to a different Bluesky account. Log out to use that account instead.",
};
