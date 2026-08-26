import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { adjacentPosts, sortPostsForPrevNext } from "src/utils/prevNextPosts";

// ISR cache tags include the route group segment
// (_N_T_/(published)/lish/...), so the pattern form
// revalidatePath("/lish/[did]/[publication]", "layout") never matches a tag —
// and the group-qualified pattern would flush every publication's subtree at
// once. Concrete paths only. A publication is addressable by rkey (canonical
// links and the custom-domain rewrite target) and by name (legacy links), so
// both bases are invalidated.
export function revalidatePublicationPaths(
  pubUri: string,
  name: string | null | undefined,
  subpaths: string[] = [""],
) {
  let aturi;
  try {
    aturi = new AtUri(pubUri);
  } catch {
    return;
  }
  const bases = new Set([`/lish/${aturi.host}/${aturi.rkey}`]);
  // Raw, not encodeURIComponent'd: cache tags are derived from the DECODED
  // pathname, so "Le Bruit des bottes" must match with its spaces intact.
  if (name) bases.add(`/lish/${aturi.host}/${name}`);
  for (const base of bases)
    for (const sub of subpaths) revalidatePath(`${base}${sub}`);
}

function postSubpath(rkey: string, docPath: string | null | undefined) {
  return docPath && docPath !== `/${rkey}`
    ? [docPath.startsWith("/") ? docPath : `/${docPath}`]
    : [];
}

// A single post's pages: its base URL, the archive listing, its rkey path,
// its record `path` (if set to something other than the rkey) since documents
// can publish under a custom path, and `extraPaths` — the publication's own
// published pages (any of which may carry a posts list that includes this
// post) and the neighbouring posts whose prev/next buttons name it.
function revalidatePostPaths(
  pubUri: string,
  name: string | null | undefined,
  rkey: string,
  docPath: string | null | undefined,
  extraPaths: string[] = [],
) {
  revalidatePublicationPaths(pubUri, name, [
    "",
    "/archive",
    `/${rkey}`,
    ...extraPaths,
    ...postSubpath(rkey, docPath),
  ]);
}

// Route-serving paths of each publication's published pages, keyed by
// publication uri. External link tabs store a full URL in `path`; only real
// routes count, and "/" is the publication base every caller already drops.
async function publishedPagePathsByPublication(pubUris: string[]) {
  const byPub = new Map<string, string[]>();
  if (!pubUris.length) return byPub;
  const { data } = await supabaseServerClient
    .from("publication_pages")
    .select("publication, path")
    .in("publication", pubUris);
  for (const row of data ?? []) {
    if (!row.path || !row.path.startsWith("/") || row.path === "/") continue;
    byPub.set(row.publication, [
      ...(byPub.get(row.publication) ?? []),
      row.path,
    ]);
  }
  return byPub;
}

// The publication's posts as the prev/next buttons order them, plus the
// preferences that decide whether any post renders those buttons.
const POST_NEIGHBOURS_SELECT =
  "documents_in_publications(documents(uri, sort_date, path:data->>path, title:data->>title, publishedAt:data->>publishedAt))";
type PostNeighboursRows = {
  documents: {
    uri: string;
    sort_date: string | null;
    path: string | null;
    title: string | null;
    publishedAt: string | null;
  } | null;
}[];

// Post pages render their neighbours' titles in the prev/next row and the
// first/last post in the first/last row, so a post appearing, disappearing,
// or changing title stales the pages either side of it — and, when first/last
// buttons are on and the post is at an edge, every post in the publication.
// `doc.sort_date` is where the post sits (or sat, for a delete) in that order.
function neighbourPostPaths(
  record: unknown,
  rows: PostNeighboursRows | null | undefined,
  doc: { uri: string; sort_date: string | null | undefined },
) {
  const preferences = normalizePublicationRecord(record)?.preferences;
  const showPrevNext = preferences?.showPrevNext !== false;
  const showFirstLast = preferences?.showFirstLast === true;
  if (!showPrevNext && !showFirstLast) return [];
  const sorted = sortPostsForPrevNext(
    (rows ?? []).flatMap((r) => (r.documents ? [r.documents] : [])),
  );
  const { prev, next, atEdge } = adjacentPosts(sorted, doc);
  const targets =
    showFirstLast && atEdge
      ? sorted
      : showPrevNext
        ? [prev, next].filter((d): d is (typeof sorted)[number] => !!d)
        : [];
  return targets
    .filter((d) => d.uri !== doc.uri)
    .flatMap((d) => {
      const rkey = new AtUri(d.uri).rkey;
      return [`/${rkey}`, ...postSubpath(rkey, d.path)];
    });
}

// Every cached page that lists or renders a document: the standalone /p/ URL
// and, for each publication it belongs to, the post/index/archive paths and
// the neighbouring posts whose prev/next buttons point at it. Callable before
// the document row exists (nothing to look up → /p/ only) or after it's gone:
// pass `snapshot` (captured pre-delete) and the join-row lookup is skipped —
// publication names, posts and preferences still resolve from the
// publications table, which outlives the document.
export async function revalidateDocumentPaths(
  documentUri: string,
  snapshot?: {
    publications: string[];
    path?: string | null;
    sort_date?: string | null;
  },
) {
  let docUri;
  try {
    docUri = new AtUri(documentUri);
  } catch {
    return;
  }
  let pubs: {
    uri: string;
    name: string | null | undefined;
    neighbours: string[];
  }[] = [];
  let docPath = snapshot?.path;
  if (snapshot) {
    if (snapshot.publications.length) {
      const { data } = await supabaseServerClient
        .from("publications")
        .select(`uri, record, ${POST_NEIGHBOURS_SELECT}`)
        .in("uri", snapshot.publications);
      pubs = snapshot.publications.map((uri) => {
        const pub = data?.find((r) => r.uri === uri);
        return {
          uri,
          name: normalizePublicationRecord(pub?.record)?.name,
          neighbours: neighbourPostPaths(
            pub?.record,
            pub?.documents_in_publications,
            { uri: documentUri, sort_date: snapshot.sort_date },
          ),
        };
      });
    }
  } else {
    const { data: rows } = await supabaseServerClient
      .from("documents_in_publications")
      .select(
        `publications(uri, record, ${POST_NEIGHBOURS_SELECT}), documents(data, sort_date)`,
      )
      .eq("document", documentUri);
    for (const row of rows ?? []) {
      if (!row.publications) continue;
      pubs.push({
        uri: row.publications.uri,
        name: normalizePublicationRecord(row.publications.record)?.name,
        neighbours: neighbourPostPaths(
          row.publications.record,
          row.publications.documents_in_publications,
          { uri: documentUri, sort_date: row.documents?.sort_date },
        ),
      });
      // Documents publish under record.path (usually "/<rkey>", but other
      // clients can write any path) — drop both spellings.
      docPath =
        docPath ?? (row.documents?.data as { path?: string } | null)?.path;
    }
  }
  const pagePaths = await publishedPagePathsByPublication(
    pubs.map((p) => p.uri),
  );
  for (const pub of pubs)
    revalidatePostPaths(pub.uri, pub.name, docUri.rkey, docPath, [
      ...(pagePaths.get(pub.uri) ?? []),
      ...pub.neighbours,
    ]);
  // Handle-form /p/ URLs canonical-redirect onto this one, so the did
  // spelling is the only cache entry a document has here.
  revalidatePath(`/p/${docUri.host}/${docUri.rkey}`);
}

// For settings stored outside the publication record (newsletter, membership
// tiers): cached publication and post pages render them (subscribe UI, the
// members-only gate's tier list), so their mutations must drop the same
// paths. The record isn't at hand in those actions, so resolve the name here
// for the legacy name-form URLs.
export async function revalidatePublicationSettingsPaths(pubUri: string) {
  const { data } = await supabaseServerClient
    .from("publications")
    .select("record")
    .eq("uri", pubUri)
    .single();
  await revalidateAllPublicationPaths(pubUri, [
    normalizePublicationRecord(data?.record)?.name,
  ]);
}

// For changes that touch every page of a publication (theme, name, base
// path): enumerate the publication's published pages and post URLs and drop
// them all. `names` should carry both the old and new name on a rename so
// legacy name-form URLs don't serve the old site for the stale window.
export async function revalidateAllPublicationPaths(
  pubUri: string,
  names: (string | null | undefined)[],
) {
  const [{ data: pages }, { data: docs }] = await Promise.all([
    supabaseServerClient
      .from("publication_pages")
      .select("path")
      .eq("publication", pubUri),
    supabaseServerClient
      .from("documents_in_publications")
      .select("documents(uri, data)")
      .eq("publication", pubUri),
  ]);
  const subpaths = new Set<string>([
    "",
    "/archive",
    "/subscribe",
    "/membership",
  ]);
  for (const p of pages ?? []) {
    // External link tabs store a full URL in `path`; only real routes count.
    if (p.path && p.path.startsWith("/") && p.path !== "/")
      subpaths.add(p.path);
  }
  const standalone: string[] = [];
  for (const row of docs ?? []) {
    if (!row.documents) continue;
    const docUri = new AtUri(row.documents.uri);
    subpaths.add(`/${docUri.rkey}`);
    const docPath = (row.documents.data as { path?: string } | null)?.path;
    if (docPath)
      subpaths.add(docPath.startsWith("/") ? docPath : `/${docPath}`);
    standalone.push(`/p/${docUri.host}/${docUri.rkey}`);
  }
  const subList = [...subpaths];
  for (const name of new Set(names.filter(Boolean)))
    revalidatePublicationPaths(pubUri, name, subList);
  if (!names.filter(Boolean).length)
    revalidatePublicationPaths(pubUri, null, subList);
  for (const path of standalone) revalidatePath(path);
}
