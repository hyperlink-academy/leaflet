import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
import { fullUnsubscribe } from "src/subscriptions/unsubscribe";
import { disableEmailForIdentity } from "src/subscriptions/email";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { MAIN_SITE_URL } from "src/utils/customDomain";

// Looks up a subscriber by unsubscribe_token and fully unsubscribes them:
// email rows flip to `unsubscribed` and, for a linked atproto account, the
// subscription record is removed too. The one exception is an active paid
// membership — a token link must never touch Stripe, so those readers get
// email delivery turned off and a pointer to the signed-in manage flow, with
// the membership (and its atproto record) intact. Idempotent —
// already-unsubscribed rows return ok without appending a duplicate event.
//
// NOTE: Postmark Suppressions API is intentionally NOT called here. This
// endpoint is hit from in-email footer links AND from Postmark's one-click
// List-Unsubscribe-Post — but for BOTH cases, Phase 7 handles webhook-driven
// suppression reconciliation. The immediate effect of this route is purely
// local state + event log.

type UnsubscribeOutcome =
  | { result: "invalid" }
  | {
      result: "unsubscribed" | "membership_active" | "error";
      email: string;
      publicationName?: string;
      manageUrl: string;
    };

async function unsubscribeByToken(token: string): Promise<UnsubscribeOutcome> {
  const { data: sub } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, email, state, publication, identity_id, publications(record)")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!sub) return { result: "invalid" };

  const normalized = normalizePublicationRecord(sub.publications?.record);
  const publicationName = normalized?.name;
  // Managing (tier changes, cancellation, the email toggle) requires a real
  // session: bounce through email-login, which reuses a matching session or
  // emails a code, then lands back on the publication with the manage panel
  // auto-opened.
  const managedTarget = normalized?.url
    ? `${normalized.url.replace(/\/$/, "")}?manage_subscription=1`
    : `${MAIN_SITE_URL}/subscriptions`;
  const manageUrl = `${MAIN_SITE_URL}/api/auth/email-login?${new URLSearchParams(
    { email: sub.email, redirect: managedTarget },
  ).toString()}`;
  const base = { email: sub.email, publicationName, manageUrl };

  const { data: identity } = sub.identity_id
    ? await supabaseServerClient
        .from("identities")
        .select("id, atp_did, email")
        .eq("id", sub.identity_id)
        .maybeSingle()
    : { data: null };

  const result = await fullUnsubscribe({
    publication: sub.publication,
    identity,
    subscriberRows: [{ id: sub.id, state: sub.state }],
  });
  if (result.ok) return { result: "unsubscribed", ...base };

  // A membership error implies fullUnsubscribe resolved one, which it only
  // does for a non-null identity.
  if (
    identity &&
    (result.error === "membership_active" ||
      result.error === "membership_pending_cancellation")
  ) {
    const disabled = await disableEmailForIdentity(sub.publication, identity);
    return disabled.ok
      ? { result: "membership_active", ...base }
      : { result: "error", ...base };
  }
  return { result: "error", ...base };
}

// Escape HTML-unsafe chars for interpolation into a static page body.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Oxygen, Ubuntu, Cantarell, sans-serif;
        background: #f6f6f6;
        color: #272727;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
      }
      .card {
        background: white;
        padding: 32px;
        border-radius: 12px;
        max-width: 420px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        text-align: center;
      }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0 0 8px; line-height: 1.5; color: #555; }
      .email { font-weight: 600; color: #272727; }
      .manage { display: inline-block; margin-top: 12px; color: #272727; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${esc(title)}</h1>
      ${bodyHtml}
    </div>
  </body>
</html>`;
}

function manageLink(manageUrl: string): string {
  return `<a class="manage" href="${esc(manageUrl)}">Manage subscription</a>`;
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("unsubscribe_token");
  // Postmark fires List-Unsubscribe-Post with no body. Always return 200 —
  // a non-2xx makes Postmark retry, and the stream-level suppression has
  // already happened on Postmark's side regardless of our response.
  if (token) await unsubscribeByToken(token);
  return new Response(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("unsubscribe_token");
  if (!token) {
    return new NextResponse(
      htmlPage(
        "Unsubscribe link invalid",
        `<p>This unsubscribe link is missing a token. Try opening it directly from the email footer.</p>`,
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  const outcome = await unsubscribeByToken(token);
  if (outcome.result === "invalid") {
    return new NextResponse(
      htmlPage(
        "Unsubscribe link invalid",
        `<p>We couldn't find this subscription. It may have already been removed.</p>`,
      ),
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
  const pubName = outcome.publicationName
    ? esc(outcome.publicationName)
    : "this publication";
  if (outcome.result === "error") {
    return new NextResponse(
      htmlPage(
        "Something went wrong",
        `<p>We couldn't complete the unsubscribe. Please try again, or manage your subscription directly.</p>
         ${manageLink(outcome.manageUrl)}`,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  if (outcome.result === "membership_active") {
    return new NextResponse(
      htmlPage(
        "Emails stopped",
        `<p>Future emails to <span class="email">${esc(outcome.email)}</span> from ${pubName} have been stopped.</p>
         <p>Your paid membership is still active — you can change or cancel it from your subscription settings.</p>
         ${manageLink(outcome.manageUrl)}`,
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  return new NextResponse(
    htmlPage(
      "Unsubscribed",
      `<p>Future emails to <span class="email">${esc(outcome.email)}</span> from ${pubName} have been stopped, and your subscription has been removed.</p>
       ${manageLink(outcome.manageUrl)}`,
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
