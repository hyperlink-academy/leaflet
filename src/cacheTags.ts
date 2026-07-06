// Cache tag names shared by the published pages, server actions, and the
// appview's /api/revalidate calls — keep every producer and consumer on these
// helpers so the strings can't drift apart.

// A publication identified by its AT-URI.
export const pubTag = (uri: string) => `pub:${uri}`;

// The route coordinates a publication page was requested with; `name` is the
// decoded [publication] URL segment (name or rkey).
export const pubRouteTag = (did: string, name: string) =>
  `pub-route:${did}:${name}`;

// A document identified by its AT-URI.
export const docTag = (uri: string) => `doc:${uri}`;

// The route coordinates a document page was requested with (author DID +
// rkey), independent of the record's collection namespace.
export const docRouteTag = (did: string, rkey: string) =>
  `doc-route:${did}:${rkey}`;

// A poll identified by its AT-URI.
export const pollTag = (uri: string) => `poll:${uri}`;
