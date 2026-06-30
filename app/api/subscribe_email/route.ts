import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
import {
  getPublicationURL,
  getBasePublicationURL,
} from "app/(app)/lish/createPub/getPublicationURL";
import { isProductionDomain } from "src/utils/isProductionDeployment";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { mainSiteAuthBase } from "src/utils/customDomain";

export const dynamic = "force-dynamic";

const ERROR_QUERY = "subscribe_email_error";

// Subscribe forms embedded out in the wild POST here (form-encoded or JSON).
// Rather than minting a half-confirmed subscription, hand off to the same
// email-login flow the in-app subscribe button uses: it confirms the email,
// records the subscription via the `subscribe` after-sign-in action, and
// bounces back to the publication with `subscribe_email=<email>` so the success
// modal celebrates only once the subscription is actually live.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  let email: string | null = null;
  let publicationUri: string | null = null;
  let returnTo: string | null = null;

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (body && typeof body === "object") {
      email = typeof body.email === "string" ? body.email : null;
      publicationUri =
        typeof body.publication === "string" ? body.publication : null;
      returnTo = typeof body.return_to === "string" ? body.return_to : null;
    }
  } else {
    const form = await req.formData();
    const e = form.get("email");
    const p = form.get("publication");
    const r = form.get("return_to");
    email = typeof e === "string" ? e : null;
    publicationUri = typeof p === "string" ? p : null;
    returnTo = typeof r === "string" ? r : null;
  }

  if (!publicationUri) {
    return new NextResponse("Missing publication", { status: 400 });
  }
  const requestOrigin = new URL(req.url).origin;
  const returnUrl = await resolveReturnUrl(
    publicationUri,
    returnTo,
    requestOrigin,
  );
  if (!returnUrl) {
    return new NextResponse("Publication not found", { status: 404 });
  }
  if (!email) {
    returnUrl.searchParams.set(ERROR_QUERY, "invalid_email");
    return NextResponse.redirect(returnUrl.toString(), 303);
  }

  // Email login must complete first-party on the main site (where the canonical
  // auth_token cookie lives), not on the publication's domain — it bounces the
  // session back via receive_auth_callback. `redirect` still points at the
  // publication so the success modal shows there.
  const authBase = mainSiteAuthBase(req.headers.get("host") ?? undefined) || requestOrigin;
  const loginUrl = new URL("/api/auth/email-login", authBase);
  loginUrl.searchParams.set("email", email);
  loginUrl.searchParams.set("redirect", returnUrl.toString());
  loginUrl.searchParams.set(
    "action",
    encodeActionToSearchParam({ action: "subscribe", publication: publicationUri }),
  );
  return NextResponse.redirect(loginUrl.toString(), 303);
}

async function resolveReturnUrl(
  publicationUri: string,
  returnTo: string | null,
  requestOrigin: string,
): Promise<URL | null> {
  const { data: publication } = await supabaseServerClient
    .from("publications")
    .select("uri, record")
    .eq("uri", publicationUri)
    .maybeSingle();
  if (!publication) return null;

  // In dev/preview, the publication's recorded URL points at the production
  // domain (or a custom domain) — neither serves this dev server. Force the
  // local `/lish/...` path so the redirect lands somewhere we can test.
  const pubUrl = isProductionDomain()
    ? getPublicationURL(publication)
    : getBasePublicationURL(publication);
  const base =
    pubUrl.startsWith("http://") || pubUrl.startsWith("https://")
      ? pubUrl
      : `${requestOrigin}${pubUrl}`;

  if (returnTo) {
    try {
      const candidate = new URL(returnTo, base);
      const baseOrigin = new URL(base).origin;
      if (candidate.origin === baseOrigin) return candidate;
    } catch {}
  }

  return new URL(base);
}
