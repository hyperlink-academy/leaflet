// A record can name a blob by an http(s) URL in place of a CID:
//
//   { $type: "blob", ref: { $link: "https://…/image.jpg" }, mimeType, size }
//
// This is the shape Leaflet's renderers already accept (blobRefToSrc passes
// http links through), and it lets a record be assembled without a PDS
// session — an importer, a restore — and have the bytes uploaded later by
// whatever does hold one. `resolve` turns one URL into the JSON of the
// uploaded blob, or undefined to leave that reference as it is.

export type JsonBlob = {
  $type: "blob";
  ref: { $link: string };
  mimeType: string;
  size: number;
};

export function isPendingBlob(value: unknown): value is JsonBlob {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<JsonBlob>;
  return (
    v.$type === "blob" &&
    typeof v.ref?.$link === "string" &&
    /^https?:\/\//.test(v.ref.$link)
  );
}

export async function resolveBlobLinks<T>(
  record: T,
  resolve: (url: string) => Promise<JsonBlob | undefined>,
): Promise<{ record: T; resolved: number }> {
  let resolved = 0;
  async function walk(value: unknown): Promise<unknown> {
    if (isPendingBlob(value)) {
      const blob = await resolve(value.ref.$link);
      if (!blob) return value;
      resolved++;
      return blob;
    }
    if (Array.isArray(value)) {
      const out = [];
      for (const item of value) out.push(await walk(item));
      return out;
    }
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = await walk(v);
      return out;
    }
    return value;
  }
  return { record: (await walk(record)) as T, resolved };
}
