"use server";

import { headersAllowFraming } from "src/utils/frameHeaders";

// Browsers don't expose a cross-origin page's X-Frame-Options / CSP headers,
// and a refused iframe fails silently — so the reader's post viewer asks the
// server whether a post's site opts out of framing, in parallel with the
// iframe attempt. Best-effort: if the site can't be reached, report it as
// frameable and let the iframe attempt be the real test.
const PRIVATE_HOST =
  /^(localhost$|127\.|10\.|0\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|\[|.*\.(local|internal)$)/i;

export async function checkUrlFrameable(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  // This endpoint is callable by anyone; don't let it probe the local network.
  if (PRIVATE_HOST.test(parsed.hostname)) return false;

  try {
    let controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), 5000);
    let res = await fetch(parsed.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    // Some servers reject HEAD; the GET's headers are what the iframe gets.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      res.body?.cancel();
    }
    clearTimeout(timeout);
    return headersAllowFraming(
      res.headers.get("x-frame-options"),
      res.headers.get("content-security-policy"),
    );
  } catch {
    return true;
  }
}
