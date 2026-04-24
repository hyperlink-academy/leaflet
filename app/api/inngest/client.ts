import { Inngest, eventType, staticSchema } from "inngest";

// Event type definitions. In v4, the client no longer has centralized
// schemas — each event is its own EventType, usable both as a trigger and
// as an argument to inngest.send() via event.create().
export const events = {
  feedsIndexFollows: eventType("feeds/index-follows", {
    schema: staticSchema<{ did: string }>(),
  }),
  appviewProfileUpdate: eventType("appview/profile-update", {
    schema: staticSchema<{ record: any; did: string }>(),
  }),
  appviewIndexBskyPostMention: eventType("appview/index-bsky-post-mention", {
    schema: staticSchema<{ post_uri: string; document_link: string }>(),
  }),
  appviewComeOnline: eventType("appview/come-online", {
    schema: staticSchema<Record<string, never>>(),
  }),
  userMigrateToStandard: eventType("user/migrate-to-standard", {
    schema: staticSchema<{ did: string }>(),
  }),
  userCleanupExpiredOauthSessions: eventType(
    "user/cleanup-expired-oauth-sessions",
    { schema: staticSchema<Record<string, never>>() },
  ),
  userCheckOauthSession: eventType("user/check-oauth-session", {
    schema: staticSchema<{
      identityId: string;
      did: string;
      tokenCount: number;
    }>(),
  }),
  documentsFixPublicationReferences: eventType(
    "documents/fix-publication-references",
    { schema: staticSchema<{ documentUris: string[] }>() },
  ),
  documentsFixIncorrectSiteValues: eventType(
    "documents/fix-incorrect-site-values",
    { schema: staticSchema<{ did: string }>() },
  ),
  documentsFixPostref: eventType("documents/fix-postref", {
    schema: staticSchema<{ documentUris?: string[] }>(),
  }),
  appviewSyncDocumentMetadata: eventType("appview/sync-document-metadata", {
    schema: staticSchema<{ document_uri: string; bsky_post_uri?: string }>(),
  }),
  userWriteRecordsToPds: eventType("user/write-records-to-pds", {
    schema: staticSchema<{
      did: string;
      records: Array<{
        collection: string;
        rkey: string;
        record: unknown;
      }>;
    }>(),
  }),
  stripeCheckoutSessionCompleted: eventType(
    "stripe/checkout.session.completed",
    { schema: staticSchema<{ sessionId: string }>() },
  ),
  stripeCustomerSubscriptionUpdated: eventType(
    "stripe/customer.subscription.updated",
    { schema: staticSchema<{ subscriptionId: string }>() },
  ),
  stripeCustomerSubscriptionDeleted: eventType(
    "stripe/customer.subscription.deleted",
    { schema: staticSchema<{ subscriptionId: string }>() },
  ),
  stripeInvoicePaymentSucceeded: eventType(
    "stripe/invoice.payment.succeeded",
    {
      schema: staticSchema<{
        invoiceId: string;
        subscriptionId: string;
        customerId: string;
      }>(),
    },
  ),
  stripeInvoicePaymentFailed: eventType("stripe/invoice.payment.failed", {
    schema: staticSchema<{
      invoiceId: string;
      subscriptionId: string;
      customerId: string;
    }>(),
  }),
  newsletterPostSendRequested: eventType("newsletter/post.send.requested", {
    schema: staticSchema<{
      publication_uri: string;
      document_uri: string;
      root_entity: string;
    }>(),
  }),
};

// Create a client to send and receive events.
// v4 defaults to cloud mode; opt into dev mode in local development so
// the Inngest dev server can auto-connect without a signing key.
export const inngest = new Inngest({
  id: "leaflet",
  isDev:
    process.env.INNGEST_DEV === "1" ||
    process.env.NODE_ENV === "development",
});
