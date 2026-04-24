export const NEWSLETTER_FROM_SUFFIX = "@email.leaflet.pub";
export const NO_REPLY_EMAIL = "no-reply@leaflet.pub";

export function resolveFromDomain(
  pubUrl: string | null | undefined,
  fallbackDomain: string | null | undefined,
): string | null {
  const fromUrl = pubUrl?.replace(/^https?:\/\//, "") || null;
  return fromUrl || fallbackDomain || null;
}

export function buildFromAddress(fromDomain: string): string {
  return `${fromDomain}${NEWSLETTER_FROM_SUFFIX}`;
}

export function buildFromHeader(
  pubName: string | null | undefined,
  fromDomain: string,
): string {
  const name = (pubName || "Leaflet").replace(/"/g, '\\"');
  return `"${name}" <${buildFromAddress(fromDomain)}>`;
}

export function resolveReplyToEmail(settings: {
  reply_to_email: string | null;
  reply_to_verified_at: string | null;
}): string {
  return settings.reply_to_email && settings.reply_to_verified_at
    ? settings.reply_to_email
    : NO_REPLY_EMAIL;
}
