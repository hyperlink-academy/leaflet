// Publication nav tabs are either a hosted publication page (stored as a
// relative path like "/about") or an external link (stored as a full URL like
// "https://example.com"). We tell them apart by whether the stored `path` is an
// absolute http(s) URL — there's no separate column, the shape of the path is
// the discriminator.

export function isExternalLink(path: string | null | undefined): boolean {
  if (!path) return false;
  return /^https?:\/\//i.test(path.trim());
}

// Validate + normalize user input for an external link tab. Returns the
// canonical URL string, or null if it isn't a usable absolute http(s) URL. Used
// to enforce that external link tabs always store a full url.
export function normalizeExternalLink(input: string): string | null {
  let trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.toString();
}
