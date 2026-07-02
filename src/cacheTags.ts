// Cache tag names for published publication/document pages. Pages call
// cacheTag() with these inside their "use cache" scopes; server actions and
// the appview's revalidate endpoint invalidate them. Keep every producer and
// consumer on these helpers so the strings can't drift apart.

// A publication identified by its AT-URI. Invalidate on publication record
// changes (name, theme, pages), posts added/removed, and subscription changes.
export const pubTag = (uri: string) => `pub:${uri}`;

// The route coordinates a publication page was requested with, before we know
// (or when we never learn) the publication URI — covers cached 404s.
// `name` is the decoded [publication] URL segment (name or rkey).
export const pubRouteTag = (did: string, name: string) =>
  `pub-route:${did}:${name}`;

// A document identified by its AT-URI.
export const docTag = (uri: string) => `doc:${uri}`;

// The route coordinates a document page was requested with (author DID +
// rkey) — covers cached 404s and works for both the pub.leaflet.document and
// site.standard.document namespaces.
export const docRouteTag = (did: string, rkey: string) =>
  `doc-route:${did}:${rkey}`;

// A poll identified by its AT-URI; invalidate on vote ingestion.
export const pollTag = (uri: string) => `poll:${uri}`;
