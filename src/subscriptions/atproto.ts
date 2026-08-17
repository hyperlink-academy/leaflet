import { AtpBaseClient } from "lexicons/api";
import { restoreOAuthSession } from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { trackSubscriptionEvent } from "src/subscriptionAnalytics";
import {
  Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { v7 } from "uuid";

// The PDS-record half of a subscription. Plain lib — these take arbitrary DIDs
// and perform PDS writes via the server-held OAuth sessions, so they must
// never be exported from a "use server" file (that would make them
// wire-callable with any DID).

// Best-effort publish of an AT Protocol subscription record for a known DID.
// Used by the email-subscribe flow when the subscribing email is linked to an
// atp_did: we want the user's PDS record to match their email subscription.
// Swallows all failures — the email subscription is the source of truth and
// must succeed regardless of whether the atproto write goes through.
export async function publishAtprotoSubscriptionForDid(
  atp_did: string,
  publication: string,
): Promise<void> {
  try {
    let { data: existingSubscription } = await supabaseServerClient
      .from("publication_subscriptions")
      .select("uri")
      .eq("identity", atp_did)
      .eq("publication", publication)
      .maybeSingle();
    if (existingSubscription) return;

    const sessionResult = await restoreOAuthSession(atp_did);
    if (!sessionResult.ok) return;
    let credentialSession = sessionResult.value;
    let agent = new AtpBaseClient(
      credentialSession.fetchHandler.bind(credentialSession),
    );

    let record = await agent.site.standard.graph.subscription.create(
      { repo: atp_did, rkey: TID.nextStr() },
      { publication },
    );
    await supabaseServerClient.from("publication_subscriptions").insert({
      uri: record.uri,
      record,
      publication,
      identity: atp_did,
    });

    let publicationOwner = new AtUri(publication).host;
    if (publicationOwner !== atp_did) {
      let notification: Notification = {
        id: v7(),
        recipient: publicationOwner,
        data: {
          type: "subscribe",
          subscription_uri: record.uri,
        },
      };
      await supabaseServerClient.from("notifications").insert(notification);
      await pingIdentityToUpdateNotification(publicationOwner);
    }
  } catch (e) {
    console.error(
      "[publishAtprotoSubscriptionForDid] failed:",
      atp_did,
      publication,
      e,
    );
  }
}

// Publishes atproto subscription records for every confirmed email
// subscription tied to `identityId`. Call after an identity gains an atp_did
// (account-linking, merge) so existing email-only subscriptions also live as
// records on the user's PDS — otherwise they'd be invisible to atproto-side
// consumers and would silently drop if a publication ever leaves email-only
// mode. Best-effort: errors are swallowed by publishAtprotoSubscriptionForDid.
export async function backfillAtprotoSubscriptionsForIdentity(
  identityId: string,
  atp_did: string,
): Promise<void> {
  const { data: subs } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("publication")
    .eq("identity_id", identityId)
    .eq("state", "confirmed");
  if (!subs || subs.length === 0) return;

  await Promise.all(
    subs.map((s) => publishAtprotoSubscriptionForDid(atp_did, s.publication)),
  );
}

// Best-effort removal of a DID's subscription record + row. The DB row delete
// is the effective part (it drives rosters, counts, and the viewer's
// subscribed state); a PDS delete blocked by a dead OAuth session just leaves
// a stale record behind, which we tolerate the same way we tolerate records
// deleted out-of-band from another client.
export async function deleteAtprotoSubscriptionForDid(
  atp_did: string,
  publication: string,
): Promise<void> {
  try {
    let { data: existingSubscription } = await supabaseServerClient
      .from("publication_subscriptions")
      .select("uri")
      .eq("identity", atp_did)
      .eq("publication", publication)
      .maybeSingle();
    if (!existingSubscription) return;

    const sessionResult = await restoreOAuthSession(atp_did);
    if (sessionResult.ok) {
      let credentialSession = sessionResult.value;
      let agent = new AtpBaseClient(
        credentialSession.fetchHandler.bind(credentialSession),
      );
      // Delete from both collections (old and new schema) - one or both may exist
      let rkey = new AtUri(existingSubscription.uri).rkey;
      await Promise.all([
        agent.pub.leaflet.graph.subscription
          .delete({ repo: atp_did, rkey })
          .catch(() => {}),
        agent.site.standard.graph.subscription
          .delete({ repo: atp_did, rkey })
          .catch(() => {}),
      ]);
    }

    await supabaseServerClient
      .from("publication_subscriptions")
      .delete()
      .eq("identity", atp_did)
      .eq("publication", publication);

    await trackSubscriptionEvent({
      event: "unsubscribe",
      method: "atproto",
      origin: "app",
      publicationUri: publication,
      subscriberDid: atp_did,
      recordUri: existingSubscription.uri,
    });
  } catch (e) {
    console.error(
      "[deleteAtprotoSubscriptionForDid] failed:",
      atp_did,
      publication,
      e,
    );
  }
}
