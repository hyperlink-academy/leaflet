# Test publication digests

Publication Settings → Notifications → Send test sends immediately to the
signed-in owner's account email, even when their digest frequency is Off. It
does not change their opt-in preference. The button and server action are
restricted by `isDevMode`; the server also verifies publication ownership.

## Local setup

- Connect an email address in Leaflet's account settings.
- Set `POSTMARK_API_KEY` in `.env.local` to a real Postmark server token. The
  `POSTMARK_API_TEST` token does not deliver mail and is rejected by this flow.
- The default sender is `Leaflet <accounts@leaflet.pub>`. For another Postmark
  server, set `DIGEST_FROM_EMAIL` to a sender verified on that server.
- Restart `npm run dev` after changing environment variables.

This path really sends email in development; it does not use the development
confirmation-code logger. Only the requesting owner's email is a recipient.

## Activity

The first digest counts from the beginning; subsequent digests count activity
after the last successfully sent digest's `period_end`. Time windows are
exclusive at the start and inclusive at the end. Manual tests send even with
zero activity. Scheduled Daily/Weekly sending is not implemented yet.

- Subscribers: current AT Protocol and confirmed email subscriptions first
  added in the window, deduplicating subscribers linked to the same identity.
- Likes: Leaflet recommendations on the publication's documents.
- Comments and post questions: indexed interactions on its documents.
- Mentions: mention/comment-mention notifications to the owner that refer to
  this publication or its documents/comments.
- Quotes: quote notifications to the owner about its documents.

These are new additions, not net growth after deletions or unsubscribes. Counts
reflect the connected database's indexed activity. A local database does not
automatically contain all production activity.

## Delivery bookkeeping

`notification_digests` holds the claimed period. An advisory transaction lock
and pending-row check prevent concurrent sends for the same owner/publication.
Postmark acceptance marks the row Sent and advances the next digest's cutoff;
an explicit provider rejection marks it Failed without advancing the cutoff.

If delivery times out, the process crashes, or recording acceptance fails, the
row stays Pending and blocks subsequent sends. Check Postmark activity before
reconciling it: mark Sent (with `sent_at`) if accepted, or Failed if confirmed
unsent. Do not automatically retry an uncertain delivery, because Postmark may
already have accepted it. Accepted does not guarantee inbox delivery; a later
bounce requires provider-side investigation.

No new migration is required: this uses the existing notification tables.
