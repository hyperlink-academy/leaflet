# Instant comment email notifications

Publication Settings → Notifications has an Email / Comments row with Off and
Instant choices. Off is the default, including when no preference row exists.
Comments and digest preferences are independent. There is no backfill of
comments indexed before the owner opted in.

An Instant email goes to the publication owner's account email when someone
else comments on a writing in that publication. Replies count as comments.
It contains the writing title, publication name, comment text (up to 2,000
characters), and a link opening the writing's comments drawer to respond.
It also includes a notification-settings link to opt out. Deleting the comment
or opting out before the worker runs prevents sending.

## Local development

Apply the new migration with `npx supabase migration up --local`. Configure
`POSTMARK_API_KEY` as for test digests. The sender uses `NOTIFICATION_FROM_EMAIL`,
then `DIGEST_FROM_EMAIL`, then `Leaflet <accounts@leaflet.pub>`; the sender must
be verified in the Postmark account. No production keys need to be committed.

Keep `npm run dev` running and start the Inngest development server in another
terminal, as described in the [Inngest local development guide](https://www.inngest.com/docs/local-development):

```sh
npx --ignore-scripts=false inngest-cli@latest dev --no-discovery -u http://127.0.0.1:3000/api/inngest
```

The Next development app selects Inngest dev mode automatically. If also
running the standalone appview, set `INNGEST_DEV=1` in its environment so it
queues to the same local server. Set `NEXT_PUBLIC_APP_URL` to the local app's
origin if needed to control email links. Production defaults to leaflet.pub.

Connect the owner's email address, choose Instant, then post a new comment
from a different account. Your own comments do not email you. Inspect
`send_notification_email` runs at `http://127.0.0.1:8288` if needed.

## Delivery and deployment

The shared settings API loads every choice with
`getNotificationPreferences(publication)`. Save one choice with:

```ts
setNotificationPreference(publication, { type: "digest", frequency: "weekly" });
setNotificationPreference(publication, {
  type: "comments",
  frequency: "instant",
});
```

The shared queue accepts a notification type and its subject:

```ts
queueToSendEmail({ type: "comments", subjectUri: commentUri });
```

`send_notification_email` is the Inngest worker that consumes this queue.
`sendNotificationEmails` routes each request to its type's sender; the comment
sender checks opt-ins, builds the message, and records delivery. Future types
need a request type and sender in `src/notificationEmails`, plus any preference
schema/database support. Subscriptions are not implemented yet.

Both the comment action and the indexer enqueue a deterministic event id.
Comment updates do not enqueue emails. A unique key in
`notification_email_deliveries` prevents duplicate sends even after Inngest's
event-deduplication window. Preferences are rechecked when the job runs.
Explicit provider rejections can retry; timeouts or lost responses mark the
delivery Uncertain, which prevents an automatic duplicate. If a process dies
after claiming a delivery, it may remain Sending. Reconcile Uncertain/Sending
rows against Postmark before changing them to Failed for retry or Sent with
`sent_at` filled in. Provider acceptance is not a guarantee of inbox delivery.

Queue failures are logged without failing comment submission; the indexer's
create event is a second enqueue path. Both require a working Inngest service;
there is no database outbox sweep if both enqueue attempts fail.

Deploy the migration before code that calls `set_notification_preference`.
Production requires the existing Inngest integration and Postmark credentials;
the function is registered in `/api/inngest`. This change does not enable
scheduled digest delivery or opt anyone in automatically.
