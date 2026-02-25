"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function NavStateTracker() {
  const pathname = usePathname();
  const lastState = useRef<string | null>(null);

  useEffect(() => {
    let state: string | null = null;
    if (pathname === "/home") state = "home";
    else if (pathname === "/reader" || pathname.startsWith("/reader/"))
      state = "reader";

    if (state && state !== lastState.current) {
      lastState.current = state;
      fetch("/api/update-nav-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
    }
  }, [pathname]);

  return null;
}
