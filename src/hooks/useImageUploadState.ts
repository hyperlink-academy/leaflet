"use client";
import { useSyncExternalStore } from "react";
import {
  getImageUploadState,
  subscribeToImageUploads,
  type ImageUploadState,
} from "src/utils/addImage";

// Whether the image at `src` is still on its way to storage, or gave up trying.
// Undefined covers both "already uploaded" and "uploaded in some earlier
// session" — the store only knows about uploads this tab started.
export function useImageUploadState(
  src: string | undefined,
): ImageUploadState | undefined {
  return useSyncExternalStore(
    subscribeToImageUploads,
    () => (src ? getImageUploadState(src) : undefined),
    () => undefined,
  );
}
