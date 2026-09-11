"use client";

// Marks recorded by render surfaces during a launch. Names match the
// `leaflet:*` performance.mark strings so a trace and a Tinybird row agree.
export type LaunchMarkName = "shell-paint" | "local-render" | "identity-ready";
type LaunchType = "cold" | "warm" | "soft";

// A launch that never gets all three marks (wrong route, empty state, logged
// out) must still report — this bounds how long we wait for the rest.
const MAX_WAIT_MS = 8000;

type LaunchState = {
  type: LaunchType;
  startedAt: number; // performance.now() reference this launch's durations are measured from
  route: string;
  standalone: boolean;
  swControlled: boolean;
  marks: Partial<Record<LaunchMarkName, number>>;
  sent: boolean;
  timer: ReturnType<typeof setTimeout>;
};

export type LaunchPayload = {
  launch_type: LaunchType;
  route: string;
  standalone: string;
  sw_controlled: string;
  shell_paint_ms: string;
  local_render_ms: string;
  identity_ready_ms: string;
};

let state: LaunchState | null = null;

// The actual `trackLaunch` server action can't be imported from this module:
// it's reachable from instrumentation-client.ts, which sits outside the app's
// client-component graph, so the "use server" swap doesn't apply there and
// the real (Node-only) action body ends up in the browser bundle. LaunchBeacon
// registers the sender from inside a normal Client Component instead.
let sender: ((payload: LaunchPayload) => void) | null = null;
let pendingPayload: LaunchPayload | null = null;

export function registerLaunchSender(fn: (payload: LaunchPayload) => void) {
  sender = fn;
  if (pendingPayload) {
    let payload = pendingPayload;
    pendingPayload = null;
    sender(payload);
  }
}

function deliver(payload: LaunchPayload) {
  if (sender) sender(payload);
  else pendingPayload = payload;
}

function isStandalone() {
  try {
    return matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

function isSwControlled() {
  try {
    return navigator.serviceWorker?.controller != null;
  } catch {
    return false;
  }
}

function beginLaunch(
  type: Exclude<LaunchType, "soft"> | "soft",
  route: string,
  startedAt: number,
) {
  if (state) clearTimeout(state.timer);
  state = {
    type,
    startedAt,
    route,
    standalone: isStandalone(),
    swControlled: isSwControlled(),
    marks: {},
    sent: false,
    timer: setTimeout(sendLaunchEvent, MAX_WAIT_MS),
  };
}

// Called once from instrumentation-client.ts on document load. performance.now()
// is already zeroed at navigation start, so marks need no offset here.
export function beginDocumentLaunch() {
  if (typeof window === "undefined") return;
  performance.mark("leaflet:doc-start");
  let navEntry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  let swControlled = isSwControlled();
  let type: LaunchType =
    navEntry?.type === "navigate" && !swControlled ? "cold" : "warm";
  beginLaunch(type, window.location.pathname, 0);
}

// Called from instrumentation-client.ts's onRouterTransitionStart export.
export function beginSoftLaunch(route: string) {
  if (typeof window === "undefined") return;
  beginLaunch("soft", route, performance.now());
}

export function recordLaunchMark(name: LaunchMarkName) {
  if (typeof performance === "undefined" || !state || state.sent) return;
  if (state.marks[name] != null) return;
  performance.mark(`leaflet:${name}`);
  state.marks[name] = performance.now() - state.startedAt;
  if (
    state.marks["shell-paint"] != null &&
    state.marks["local-render"] != null &&
    state.marks["identity-ready"] != null
  ) {
    sendLaunchEvent();
  }
}

function sendLaunchEvent() {
  if (!state || state.sent) return;
  state.sent = true;
  clearTimeout(state.timer);
  let { type, route, standalone, swControlled, marks } = state;
  let durationProp = (ms: number | undefined) =>
    ms == null ? "" : String(Math.round(ms));
  deliver({
    launch_type: type,
    route,
    standalone: String(standalone),
    sw_controlled: String(swControlled),
    shell_paint_ms: durationProp(marks["shell-paint"]),
    local_render_ms: durationProp(marks["local-render"]),
    identity_ready_ms: durationProp(marks["identity-ready"]),
  });
}
