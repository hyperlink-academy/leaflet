"use client";

import { useEffect } from "react";
import { trackLaunch } from "actions/trackLaunch";
import { registerLaunchSender } from "src/launchInstrumentation";

// Mounted once, root layout, alongside TrackPageView. Registering the sender
// here (a normal Client Component) rather than importing the server action
// directly into src/launchInstrumentation.ts keeps that action out of the
// instrumentation-client.ts bundle — see the comment there.
export function LaunchBeacon() {
  useEffect(() => {
    registerLaunchSender((payload) => {
      trackLaunch(payload).catch(() => {});
    });
  }, []);
  return null;
}
