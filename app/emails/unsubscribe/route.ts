import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";

// Looks up a subscriber by unsubscribe_token and flips their state to
// `unsubscribed`. Idempotent — already-unsubscribed rows return ok without
// appending a duplicate event.
//
// NOTE: Postmark Suppressions API is intentionally NOT called here. This
// endpoint is hit from in-email footer links AND from Postmark's one-click
// List-Unsubscribe-Post — but for BOTH cases, Phase 7 handles webhook-driven
// suppression reconciliation. The immediate effect of this route is purely
// local state + event log.
async function unsubscribeByToken(
  token: string,
): Promise<{ ok: boolean; email?: string; publicationName?: string }> {
  const { data: sub } = await supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, email, state, publication, publications(record)")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!sub) return { ok: false };

  const publicationName = (() => {
    const rec = sub.publications?.record as
      | { name?: string }
      | null
      | undefined;
    return rec?.name;
  })();

  if (sub.state === "unsubscribed") {
    return { ok: true, email: sub.email, publicationName };
  }

  const nowIso = new Date().toISOString();
  const [{ error: updateError }, { error: eventError }] = await Promise.all([
    supabaseServerClient
      .from("publication_email_subscribers")
      .update({
        state: "unsubscribed",
        unsubscribed_at: nowIso,
        confirmation_code: null,
      })
      .eq("id", sub.id),
    supabaseServerClient.from("publication_email_subscriber_events").insert({
      subscriber: sub.id,
      publication: sub.publication,
      event_type: "unsubscribe_requested",
    }),
  ]);
  if (updateError || eventError) {
    console.error(
      "[unsubscribe] update/event failed:",
      updateError ?? eventError,
    );
    return { ok: false };
  }
  return { ok: true, email: sub.email, publicationName };
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
  const result = await unsubscribeByToken(token);
  if (!result.ok) {
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
  const emailLine = result.email
    ? `<p>Future emails to <span class="email">${esc(result.email)}</span> from ${
        result.publicationName
          ? esc(result.publicationName)
          : "this publication"
      } have been stopped.</p>`
    : `<p>Your subscription has been removed.</p>`;
  return new NextResponse(
    htmlPage("Unsubscribed", emailLine),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
