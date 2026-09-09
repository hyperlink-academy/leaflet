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

// Route-serving paths of a publication's published pages. External link tabs
// store a full URL in `path`; only real routes count, and "/" is the
// publication base every caller already drops.
async function publishedPagePaths(publicationUri: string) {
  const { data } = await supabaseServerClient
    .from("publication_pages")
    .select("path")
    .eq("publication", publicationUri);
  return (data ?? []).flatMap((row) =>
    row.path && row.path.startsWith("/") && row.path !== "/" ? [row.path] : [],
  );
}

type NeighbourDoc = {
  uri: string;
  sort_date: string | null;
  path: string | null;
  title: string | null;
  publishedAt: string | null;
};

// Whether any of the publication's post pages render neighbour buttons at
// all — when neither is on, the sibling-post list is never needed.
function neighbourButtonPrefs(record: unknown) {
  const preferences = normalizePublicationRecord(record)?.preferences;
  return {
    showPrevNext: preferences?.showPrevNext !== false,
    showFirstLast: preferences?.showFirstLast === true,
  };
}

// The publication's posts as the prev/next buttons order them.
async function postNeighbours(publicationUri: string) {
  const { data } = await supabaseServerClient
    .from("documents_in_publications")
    .select(
      "documents(uri, sort_date, path:data->>path, title:data->>title, publishedAt:data->>publishedAt)",
    )
    .eq("publication", publicationUri);
  return (data ?? []).flatMap((row) => (row.documents ? [row.documents] : []));
}

// Post pages render their neighbours' titles in the prev/next row and the
// first/last post in the first/last row, so a post appearing, disappearing,
// or changing title stales the pages either side of it — and, when first/last
// buttons are on and the post is at an edge, every post in the publication.
// `doc.sort_date` is where the post sits (or sat, for a delete) in that order.
function neighbourPostPaths(
  {
    showPrevNext,
    showFirstLast,
  }: { showPrevNext: boolean; showFirstLast: boolean },
  docs: NeighbourDoc[],
  doc: { uri: string; sort_date: string | null | undefined },
) {
  if (!showPrevNext && !showFirstLast) return [];
  const sorted = sortPostsForPrevNext(docs);
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
// and, when it belongs to a publication, the post/index/archive paths and the
// neighbouring posts whose prev/next buttons point at it. Callable before the
// document row exists (nothing to look up → /p/ only) or after it's gone:
// pass `snapshot` (captured pre-delete) and the join-row lookup is skipped —
// the publication name, posts and preferences still resolve from the
// publications table, which outlives the document.
export async function revalidateDocumentPaths(
  documentUri: string,
  opts?: {
    snapshot?: {
      publication?: string | null;
      path?: string | null;
      sort_date?: string | null;
    };
    // Interaction events (comments/recommends) re-render a post's own pages
    // but never change adjacency or neighbour titles, so they skip the
    // sibling-post lookup entirely.
    neighbours?: boolean;
  },
) {
  const snapshot = opts?.snapshot;
  let docUri;
  try {
    docUri = new AtUri(documentUri);
  } catch {
    return;
  }
  let pub: {
    uri: string;
    name: string | null | undefined;
    record: unknown;
  } | null = null;
  let docPath = snapshot?.path;
  let sortDate = snapshot?.sort_date;
  if (snapshot) {
    if (snapshot.publication) {
      const { data } = await supabaseServerClient
        .from("publications")
        .select("record")
        .eq("uri", snapshot.publication)
        .maybeSingle();
      pub = {
        uri: snapshot.publication,
        record: data?.record,
        name: normalizePublicationRecord(data?.record)?.name,
      };
    }
  } else {
    const { data: row } = await supabaseServerClient
      .from("documents_in_publications")
      .select(
        "publications(uri, record), documents(sort_date, path:data->>path)",
      )
      .eq("document", documentUri)
      .maybeSingle();
    if (row?.publications) {
      pub = {
        uri: row.publications.uri,
        record: row.publications.record,
        name: normalizePublicationRecord(row.publications.record)?.name,
      };
      // Documents publish under record.path (usually "/<rkey>", but other
      // clients can write any path) — drop both spellings.
      docPath = docPath ?? row.documents?.path;
      sortDate = sortDate ?? row.documents?.sort_date;
    }
  }
  if (pub) {
    const prefs = neighbourButtonPrefs(pub.record);
    const loadNeighbours =
      opts?.neighbours !== false && (prefs.showPrevNext || prefs.showFirstLast);
    const [pagePaths, neighbourDocs] = await Promise.all([
      publishedPagePaths(pub.uri),
      loadNeighbours ? postNeighbours(pub.uri) : Promise.resolve([]),
    ]);
    revalidatePostPaths(pub.uri, pub.name, docUri.rkey, docPath, [
      ...pagePaths,
      ...(loadNeighbours
        ? neighbourPostPaths(prefs, neighbourDocs, {
            uri: documentUri,
            sort_date: sortDate,
          })
        : []),
    ]);
  }
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
      .select("documents(uri, path:data->>path)")
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
    const docPath = row.documents.path;
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
