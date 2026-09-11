"use server";

import { getValidAuthToken } from "src/identityPayload";
import { resolveAuthToken } from "src/auth";
import { trackUserEvent } from "src/activeUserAnalytics";
import type { LaunchPayload } from "src/launchInstrumentation";

// Client-callable, so every field is untrusted analytics input: clamp rather
// than validate, a bad value only pollutes one row.
export async function trackLaunch(properties: LaunchPayload) {
  let auth = await resolveAuthToken((await getValidAuthToken()) ?? undefined);
  if (!auth) return;
  trackUserEvent(auth.identity, "launch", {
    launch_type: String(properties.launch_type).slice(0, 32),
    route: String(properties.route).slice(0, 512),
    standalone: String(properties.standalone).slice(0, 8),
    sw_controlled: String(properties.sw_controlled).slice(0, 8),
    shell_paint_ms: String(properties.shell_paint_ms).slice(0, 16),
    local_render_ms: String(properties.local_render_ms).slice(0, 16),
    identity_ready_ms: String(properties.identity_ready_ms).slice(0, 16),
  });
}
