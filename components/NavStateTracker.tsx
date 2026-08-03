"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Module scope rather than a ref: this tracker unmounts whenever the
// (home-pages) layout does — going into a publication dashboard and back —
// and a per-instance ref would re-POST the state it just wrote.
let lastState: string | null = null;

export function NavStateTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let state: string | null = null;
    if (pathname === "/home") state = "home";
    else if (pathname === "/reader" || pathname.startsWith("/reader/"))
      state = "reader";

    if (state && state !== lastState) {
      lastState = state;
      fetch("/api/update-nav-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
    }
  }, [pathname]);

  return null;
}
