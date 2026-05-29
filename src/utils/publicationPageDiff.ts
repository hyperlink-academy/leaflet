import { BlobRef } from "@atproto/lexicon";
import type { PubLeafletPublicationPage } from "lexicons/api";
import type { ProcessBlocksToPagesHooks } from "src/utils/factsToPagesRecord";

// The published record stores BlobRef CIDs for images and at-uri/cid for polls,
// neither of which we can recompute client-side without uploading. For the
// dirty check we generate the would-be-record using the placeholder hooks
// below, then strip both records of those opaque fields before comparing.

export const dirtyCheckHooks: ProcessBlocksToPagesHooks = {
  uploadImage: async (src) =>
    ({
      ref: { $link: src },
      mimeType: "image/*",
      size: 0,
    }) as unknown as BlobRef,
  uploadPoll: async (entityId) => ({
    uri: `at://dirty-check/${entityId}`,
    cid: "dirty-check",
  }),
};

function stripVolatile(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const type = obj["$type"];
    if (type === "pub.leaflet.blocks.image" || type === "pub.leaflet.blocks.website") {
      const { image: _image, previewImage: _previewImage, ...rest } = obj as {
        image?: unknown;
        previewImage?: unknown;
      } & Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, stripVolatile(v)]),
      );
    }
    if (type === "pub.leaflet.blocks.poll") {
      const { pollRef: _pollRef, ...rest } = obj as {
        pollRef?: unknown;
      } & Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, stripVolatile(v)]),
      );
    }
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, stripVolatile(v)]),
    );
  }
  return value;
}

// `publishedAt` is set to "now" on every publish, so a freshly generated
// record will always differ from the stored one on that field alone.
export function normalizePageRecordForDiff(
  record: PubLeafletPublicationPage.Record | Record<string, unknown> | null | undefined,
): unknown {
  if (!record) return null;
  const { publishedAt: _publishedAt, ...rest } = record as Record<string, unknown>;
  return stripVolatile(rest);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}
