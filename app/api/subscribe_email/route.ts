import { NextRequest, NextResponse } from "next/server";
import { requestPublicationEmailSubscription } from "actions/publications/subscribeEmail";
import { supabaseServerClient } from "supabase/serverClient";
import {
  getPublicationURL,
  getBasePublicationURL,
} from "app/(app)/lish/createPub/getPublicationURL";
import { isProductionDomain } from "src/utils/isProductionDeployment";

export const dynamic = "force-dynamic";

const SUBSCRIBE_QUERY = "subscribe_email";
const ERROR_QUERY = "subscribe_email_error";

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
      returnTo =
        typeof body.return_to === "string" ? body.return_to : null;
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
  if (!email) {
    return redirectWithError(
      publicationUri,
      returnTo,
      requestOrigin,
      "invalid_email",
    );
  }

  const result = await requestPublicationEmailSubscription(
    publicationUri,
    email,
  );

  if (!result.ok) {
    return redirectWithError(
      publicationUri,
      returnTo,
      requestOrigin,
      result.error,
    );
  }

  const target = await resolveReturnUrl(publicationUri, returnTo, requestOrigin);
  if (!target) {
    return new NextResponse("Publication not found", { status: 404 });
  }
  target.searchParams.set(SUBSCRIBE_QUERY, email);
  if (result.value.confirmed) {
    target.searchParams.set("subscribe_email_confirmed", "1");
  }
  return NextResponse.redirect(target.toString(), 303);
}

async function redirectWithError(
  publicationUri: string,
  returnTo: string | null,
  requestOrigin: string,
  error: string,
) {
  const target = await resolveReturnUrl(publicationUri, returnTo, requestOrigin);
  if (!target) {
    return new NextResponse(`Subscription failed: ${error}`, { status: 400 });
  }
  target.searchParams.set(ERROR_QUERY, error);
  return NextResponse.redirect(target.toString(), 303);
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
