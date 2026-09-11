// GET RPC reads carry their input as a single `?input=` query param so
// Vercel's CDN can key on the URL. Uses TextEncoder/TextDecoder instead of
// Buffer/btoa directly so the same code runs unchanged in the browser client
// and the Node route handler.

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  let base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  let binary =
    typeof atob === "function"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  let bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeInput(value: unknown): string {
  let json = JSON.stringify(value ?? {});
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeInput(encoded: string): unknown {
  let json = new TextDecoder().decode(base64UrlToBytes(encoded));
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
