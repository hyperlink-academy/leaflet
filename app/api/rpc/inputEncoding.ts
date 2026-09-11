// GET RPC reads carry their input as a single `?input=` query param so
// Vercel's CDN can key on the URL.
import { toBase64Url, fromBase64Url } from "src/crossSiteAuth";

export function encodeInput(value: unknown): string {
  let json = JSON.stringify(value ?? {});
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeInput(encoded: string): unknown {
  let json = new TextDecoder().decode(fromBase64Url(encoded));
  return JSON.parse(json);
}

// Sorts object keys and arrays of strings (DID/URI lists) so requests for
// the same logical input in a different order produce the same URL, and
// therefore the same CDN cache key.
export function canonicalizeInput(value: unknown): unknown {
  if (Array.isArray(value)) {
    let mapped = value.map(canonicalizeInput);
    return mapped.every((v) => typeof v === "string")
      ? [...(mapped as string[])].sort()
      : mapped;
  }
  if (value && typeof value === "object") {
    let sorted: Record<string, unknown> = {};
    for (let key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalizeInput((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
