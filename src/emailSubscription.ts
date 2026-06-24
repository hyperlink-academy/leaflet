import { supabaseServerClient } from "supabase/serverClient";
import { publishAtprotoSubscriptionForDid } from "app/(app)/lish/subscribeToPublication";
import { parseActionFromSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { Ok, Err, type Result } from "src/result";

// Internal server-side helpers, NOT server actions: recordEmailSubscription
// trusts its identityId, so exporting it from a "use server" file would expose it
// as a client-callable endpoint.

// Marks an already-authenticated identity as a confirmed email subscriber and
// mirrors it to atproto. Shared by the logged-in one-click subscribe and the
// after-sign-in subscribe; callers must have authenticated identityId.
export async function recordEmailSubscription(
  publicationUri: string,
  email: string,
  identityId: string,
): Promise<Result<null, "database_error">> {
  const { data: existing } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("state")
    .eq("publication", publicationUri)
    .eq("email", email)
    .maybeSingle();
  const wasUnsubscribed = existing?.state === "unsubscribed";

  const { data: subscriber, error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .upsert(
      {
        publication: publicationUri,
        email,
        identity_id: identityId,
        state: "confirmed",
        confirmation_code: null,
        confirmed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: "publication,email" },
    )
    .select("id")
    .single();
  if (error || !subscriber) {
    console.error("[recordEmailSubscription] upsert failed:", error);
    return Err("database_error");
  }

  const { error: eventsError } = await supabaseServerClient
    .from("publication_email_subscriber_events")
    .insert([
      {
        subscriber: subscriber.id,
        publication: publicationUri,
        event_type: wasUnsubscribed ? "resubscribed" : "subscribe_requested",
      },
      {
        subscriber: subscriber.id,
        publication: publicationUri,
        event_type: "confirmed",
      },
    ]);
  if (eventsError) {
    console.error("[recordEmailSubscription] events failed:", eventsError);
    return Err("database_error");
  }

  const { data: confirmedIdentity } = await supabaseServerClient
    .from("identities")
    .select("atp_did")
    .eq("id", identityId)
    .maybeSingle();
  if (confirmedIdentity?.atp_did) {
    await publishAtprotoSubscriptionForDid(
      confirmedIdentity.atp_did,
      publicationUri,
    );
  }

  return Ok(null);
}

// Runs the after-sign-in action (parsed from the `action` search param) for a
// just-authenticated email identity and returns where to send the browser. When
// there is no action — or no authenticated identity — the redirect is returned
// unchanged; only a recognized action does extra work. `subscribe` is currently
// the only handler. Called from the email-login flow's two mutually-exclusive
// entry points: the reused-session fast path in app/api/auth/email-login/route.ts
// and the fresh-confirm path in confirmEmailLogin.
export async function applyAfterSignInAction(
  action: string | null,
  redirect: string,
  email: string | null,
  identityId: string | null,
): Promise<string> {
  const parsed = parseActionFromSearchParam(action);
  if (!parsed || !email || !identityId) return redirect;

  switch (parsed.action) {
    case "subscribe": {
      await recordEmailSubscription(parsed.publication, email, identityId);
      const target = new URL(redirect);
      target.searchParams.set("subscribe_email", email);
      target.searchParams.set("subscribe_email_confirmed", "1");
      return target.toString();
    }
    default:
      return redirect;
  }
}
