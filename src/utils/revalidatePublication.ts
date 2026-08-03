import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";

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

// A single post's pages: its base URL, the archive listing, its rkey path,
// its record `path` (if set to something other than the rkey) since documents
// can publish under a custom path, and the publication's own published pages,
// any of which may carry a posts list that includes this post.
function revalidatePostPaths(
  pubUri: string,
  name: string | null | undefined,
  rkey: string,
  docPath: string | null | undefined,
  pagePaths: string[] = [],
) {
  revalidatePublicationPaths(pubUri, name, [
    "",
    "/archive",
    `/${rkey}`,
    ...pagePaths,
    ...(docPath && docPath !== `/${rkey}`
      ? [docPath.startsWith("/") ? docPath : `/${docPath}`]
      : []),
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

// Every cached page that lists or renders a document: the standalone /p/ URL
// and, for each publication it belongs to, the post/index/archive paths.
// Callable before the document row exists (nothing to look up → /p/ only) or
// after it's gone: pass `snapshot` (captured pre-delete) and the join-row
// lookup is skipped — publication names still resolve from the publications
// table, which outlives the document.
export async function revalidateDocumentPaths(
  documentUri: string,
  snapshot?: { publications: string[]; path?: string | null },
) {
  let docUri;
  try {
    docUri = new AtUri(documentUri);
  } catch {
    return;
  }
  let pubs: { uri: string; name: string | null | undefined }[] = [];
  let docPath = snapshot?.path;
  if (snapshot) {
    if (snapshot.publications.length) {
      const { data } = await supabaseServerClient
        .from("publications")
        .select("uri, record")
        .in("uri", snapshot.publications);
      pubs = snapshot.publications.map((uri) => ({
        uri,
        name: normalizePublicationRecord(
          data?.find((r) => r.uri === uri)?.record,
        )?.name,
      }));
    }
  } else {
    const { data: rows } = await supabaseServerClient
      .from("documents_in_publications")
      .select("publications(uri, record), documents(data)")
      .eq("document", documentUri);
    for (const row of rows ?? []) {
      if (!row.publications) continue;
      pubs.push({
        uri: row.publications.uri,
        name: normalizePublicationRecord(row.publications.record)?.name,
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
    revalidatePostPaths(
      pub.uri,
      pub.name,
      docUri.rkey,
      docPath,
      pagePaths.get(pub.uri),
    );
  // Handle-form /p/ URLs canonical-redirect onto this one, so the did
  // spelling is the only cache entry a document has here.
  revalidatePath(`/p/${docUri.host}/${docUri.rkey}`);
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
  const subpaths = new Set<string>(["", "/archive", "/subscribe"]);
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
