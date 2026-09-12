"use client";
import { useEffect } from "react";

// Lazy images that were never scrolled into view stay unloaded while the
// print engine paginates, so every off-screen gallery cell prints blank.
export function PrintPrep() {
  useEffect(() => {
    let onBeforePrint = () => {
      document
        .querySelectorAll<HTMLImageElement>('img[loading="lazy"]')
        .forEach((img) => {
          img.loading = "eager";
        });
    };
    window.addEventListener("beforeprint", onBeforePrint);
    return () => window.removeEventListener("beforeprint", onBeforePrint);
  }, []);
  return null;
}
