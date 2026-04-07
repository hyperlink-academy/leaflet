export function ensureProtocol(url: string) {
  if (
    url.startsWith("http") ||
    url.startsWith("mailto") ||
    url.startsWith("tel:")
  )
    return url;
  return `https://${url}`;
}
