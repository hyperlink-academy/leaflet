"use client";

import { useImageUploadStatus } from "src/utils/imageUploadStatus";
import {
  ImageErrorState,
  type ImageLoadStatus,
} from "components/ImageLoadState";
import { DotLoader } from "components/utils/DotLoader";

// The one overlay for everything that can be wrong with an editor image,
// rendered inside the image's relative-positioned wrapper. Upload state
// (loader chip while in flight, retry scrim on failure) takes precedence over
// a render failure (reload), since until the upload lands a load error is
// moot. `uploadSrc` is the storage URL upload status is tracked under (the
// same key as localImages). Published surfaces never upload and use
// ImageErrorState directly instead.
export function ImageStatusOverlay(props: {
  uploadSrc?: string;
  loadStatus?: ImageLoadStatus;
  onReload?: () => void;
  compact?: boolean;
  className?: string;
}) {
  let upload = useImageUploadStatus((s) =>
    props.uploadSrc ? s.uploads[props.uploadSrc] : undefined,
  );
  if (upload?.state === "uploading")
    return (
      <div className="absolute top-1 left-1 z-10 rounded-md bg-bg-page/80 text-secondary pointer-events-none">
        <DotLoader />
      </div>
    );
  if (upload?.state === "failed")
    return (
      <ImageErrorState
        message="Upload didn't finish,"
        actionLabel="try again?"
        onAction={upload.retry}
        compact={props.compact}
        className={props.className}
      />
    );
  if (props.loadStatus === "error" && props.onReload)
    return (
      <ImageErrorState
        message="Something went wrong,"
        actionLabel="reload?"
        onAction={props.onReload}
        compact={props.compact}
        className={props.className}
      />
    );
  return null;
}
