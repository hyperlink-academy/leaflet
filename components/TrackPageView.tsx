"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasSessionMarker } from "src/sessionMarker";
import { trackPageView } from "actions/trackPageView";

// Fires once per route change. Gated on the session marker so anonymous
// readers (and bots) on cached published pages never make the request.
export function TrackPageView() {
  let pathname = usePathname();
  useEffect(() => {
    if (!hasSessionMarker()) return;
    trackPageView({ path: pathname, host: window.location.host }).catch(
      () => {},
    );
  }, [pathname]);
  return null;
}
