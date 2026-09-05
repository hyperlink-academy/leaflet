"use server";

import { getValidAuthToken } from "src/identityPayload";
import { resolveAuthToken } from "src/auth";
import { trackUserEvent } from "src/activeUserAnalytics";

// Client-callable, so path/host are untrusted analytics input: clamp them
// rather than validating, a bad value only pollutes one row.
export async function trackPageView(page: { path: string; host: string }) {
  let auth = await resolveAuthToken((await getValidAuthToken()) ?? undefined);
  if (!auth) return;
  trackUserEvent(auth.identity, "page_view", {
    path: String(page.path).slice(0, 512),
    host: String(page.host).slice(0, 253),
  });
}
