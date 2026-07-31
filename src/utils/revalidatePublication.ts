import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";

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
// and its record `path` (if set to something other than the rkey) since
// documents can publish under a custom path.
export function revalidatePostPaths(
  pubUri: string,
  name: string | null | undefined,
  rkey: string,
  docPath: string | null | undefined,
) {
  revalidatePublicationPaths(pubUri, name, [
    "",
    "/archive",
    `/${rkey}`,
    ...(docPath && docPath !== `/${rkey}`
      ? [docPath.startsWith("/") ? docPath : `/${docPath}`]
      : []),
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
