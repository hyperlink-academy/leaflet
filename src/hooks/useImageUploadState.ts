"use client";
import { useSyncExternalStore } from "react";
import {
  getImageUploadState,
  subscribeToImageUploads,
  type ImageUploadState,
} from "src/utils/addImage";

// The store only knows about uploads this tab started, so undefined also
// means "already uploaded".
export function useImageUploadState(
  src: string | undefined,
): ImageUploadState | undefined {
  return useSyncExternalStore(
    subscribeToImageUploads,
    () => (src ? getImageUploadState(src) : undefined),
    () => undefined,
  );
}
