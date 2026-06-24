export const receive_auth_callback_route = "/receive_auth_callback";

export type CROSS_SITE_AUTH_RESPONSE = {
  redirect: string;
  auth_token: string | null;
};

const ALGO = "AES-GCM";
const IV_BYTES = 12;
const MAX_TOKEN_AGE_MS = 60_000;

async function getKey(): Promise<CryptoKey> {
  if (!process.env.CROSS_SITE_AUTH_SECRET)
    throw new Error("Environment variable CROSS_SITE_AUTH_SECRET not set");
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(process.env.CROSS_SITE_AUTH_SECRET),
  );
  return crypto.subtle.importKey("raw", keyMaterial, { name: ALGO }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptCrossSiteToken(
  data: CROSS_SITE_AUTH_RESPONSE,
): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(
    JSON.stringify({ ...data, iat: Date.now() }),
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: ALGO, iv }, key, plaintext),
  );
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return toBase64Url(combined);
}

export async function decryptCrossSiteToken(
  token: string,
): Promise<CROSS_SITE_AUTH_RESPONSE | null> {
  try {
    const key = await getKey();
    const combined = fromBase64Url(token);
    const iv = combined.slice(0, IV_BYTES);
    const ciphertext = combined.slice(IV_BYTES);
    const plaintext = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext,
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext));
    if (
      typeof parsed?.iat !== "number" ||
      Date.now() - parsed.iat > MAX_TOKEN_AGE_MS
    )
      return null;
    return { redirect: parsed.redirect, auth_token: parsed.auth_token };
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
