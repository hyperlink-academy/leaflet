export const receive_auth_callback_route = "/receive_auth_callback";

// The main site signs this and hands it to a custom domain's
// receive_auth_callback, which stores auth_token as the domain's first-party
// external_auth_token cookie and forwards to `redirect`.
export type CROSS_SITE_AUTH_RESPONSE = {
  redirect: string;
  auth_token: string | null;
};

export const signCrossSiteToken = async (input: string) => {
  if (!process.env.CROSS_SITE_AUTH_SECRET)
    throw new Error("Environment variable CROSS_SITE_AUTH_SECRET not set ");
  const encoder = new TextEncoder();
  const keyData = encoder.encode(process.env.CROSS_SITE_AUTH_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};
