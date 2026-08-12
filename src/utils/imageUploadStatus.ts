import { create } from "zustand";

// Tracks in-flight and failed image uploads keyed by their public storage URL
// (the same key as localImages), so image renderers can show progress and offer
// a manual retry without threading state through the upload call chain.
export type ImageUploadStatus =
  | { state: "uploading" }
  | { state: "failed"; retry: () => void };

export const useImageUploadStatus = create<{
  uploads: { [src: string]: ImageUploadStatus };
}>(() => ({ uploads: {} }));

export function setImageUploadStatus(src: string, status: ImageUploadStatus) {
  useImageUploadStatus.setState((s) => ({
    uploads: { ...s.uploads, [src]: status },
  }));
}

export function clearImageUploadStatus(src: string) {
  useImageUploadStatus.setState((s) => {
    if (!(src in s.uploads)) return s;
    let { [src]: _removed, ...uploads } = s.uploads;
    return { uploads };
  });
}
