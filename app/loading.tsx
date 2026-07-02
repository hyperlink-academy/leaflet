// Root Suspense boundary. Under cacheComponents every route that reads
// request data (cookies, headers, searchParams) or does uncached IO must have
// a Suspense boundary above it; this provides one for the whole app. Cached
// published pages render into the static shell and never show this fallback.
export default function Loading() {
  return null;
}
