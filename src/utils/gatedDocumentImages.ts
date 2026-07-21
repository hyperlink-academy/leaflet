import { createHash } from "node:crypto";
import { supabaseServerClient } from "supabase/serverClient";

const BUCKET = "minilink-user-assets";

// Images below the members-only delimiter never reach the PDS (see
// makePublishUploadHooks), so the published record references Supabase storage
// directly. Draft assets are deleted the moment the author removes their block
// (removeBlock/removeGalleryImage), which would break the published copy, so
// publish copies each gated image into a folder scoped to the document.
// Object names reuse the draft's uuid filename, so re-publishing an unchanged
// post finds the copies already in place instead of accumulating duplicates,
// and removeStale() drops the ones the latest publish no longer uses.
export type GatedImageStore = ReturnType<typeof makeGatedImageStore>;

export function makeGatedImageStore(doc: { did: string; rkey: string }) {
  // ":" is outside Supabase storage's safe object-key characters.
  const folder = `gated-documents/${doc.did.replaceAll(":", ".")}/${doc.rkey}`;
  const storage = supabaseServerClient.storage.from(BUCKET);

  let existing: Promise<Set<string>> | undefined;
  const listExisting = () =>
    (existing ??= storage
      .list(folder, { limit: 1000 })
      .then(({ data }) => new Set((data ?? []).map((o) => o.name))));

  const ensured = new Map<string, Promise<string | undefined>>();

  const ensure = async (src: string): Promise<string | undefined> => {
    const name = objectName(src);
    const path = `${folder}/${name}`;
    const publicUrl = () => storage.getPublicUrl(path).data.publicUrl;

    if ((await listExisting()).has(name)) return publicUrl();

    const sourcePath = bucketPath(src);
    if (sourcePath) {
      const { error } = await storage.copy(sourcePath, path);
      if (!error || isAlreadyExists(error)) return publicUrl();
    }
    // Source object gone or not in our bucket: re-upload the bytes.
    const res = await fetch(src);
    if (res.status !== 200) return undefined;
    const binary = await res.blob();
    const { error } = await storage.upload(path, binary, {
      contentType: binary.type,
      cacheControl: "public, max-age=31560000, immutable",
      upsert: true,
    });
    return error ? undefined : publicUrl();
  };

  return {
    /**
     * Copy `src` into the document's folder (a no-op when the copy already
     * exists) and return the copy's public URL, or undefined when the source
     * can't be read.
     */
    ensureImage(src: string): Promise<string | undefined> {
      let inflight = ensured.get(src);
      if (!inflight) {
        inflight = ensure(src);
        ensured.set(src, inflight);
      }
      return inflight;
    },
    /**
     * Delete copies from earlier publishes that this publish didn't ensure —
     * all of them when the post is no longer gated. Call after the publish
     * has succeeded.
     */
    async removeStale(): Promise<void> {
      await Promise.all(ensured.values());
      const used = new Set([...ensured.keys()].map(objectName));
      const have = await listExisting();
      const stale = [...have].filter((n) => !used.has(n));
      if (stale.length > 0)
        await storage.remove(stale.map((n) => `${folder}/${n}`));
    },
  };
}

// Draft uploads are uuid-named (src/utils/addImage.ts), so the source filename
// is already a stable, collision-free identity for the copy. Non-bucket
// sources fall back to a hash of the URL, which is just as stable.
const objectName = (src: string) => {
  const path = bucketPath(src);
  if (path) return path.split("/").pop()!;
  return createHash("sha256").update(src).digest("hex");
};

const bucketPath = (src: string) => {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = src.indexOf(marker);
  if (idx === -1) return undefined;
  return (
    decodeURIComponent(src.slice(idx + marker.length).split("?")[0]) ||
    undefined
  );
};

const isAlreadyExists = (error: {
  message?: string;
  statusCode?: string | number;
}) =>
  String(error.statusCode) === "409" ||
  !!error.message?.toLowerCase().includes("already exists");
