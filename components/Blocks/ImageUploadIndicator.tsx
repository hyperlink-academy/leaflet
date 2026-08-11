"use client";

import { useImageUploadStatus } from "src/utils/imageUploadStatus";
import { DotLoader } from "components/utils/DotLoader";
import { ButtonPrimary } from "components/Buttons";

// Overlays upload state on an image rendered from an optimistic `local` fact:
// a loader chip in the top-left corner while the upload is in flight, and a
// scrim with a retry button when it has failed. Renders inside the image's
// relative-positioned wrapper. `compact` drops the label for small surfaces
// like gallery thumbnails.
export function ImageUploadIndicator(props: {
  src: string;
  compact?: boolean;
}) {
  let status = useImageUploadStatus((s) => s.uploads[props.src]);
  if (!status) return null;
  if (status.state === "uploading")
    return (
      <div className="absolute top-1 left-1 z-10 rounded-md bg-bg-page/80 text-secondary pointer-events-none">
        <DotLoader />
      </div>
    );
  let retry = status.retry;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-bg-page/70">
      {!props.compact && (
        <div className="font-bold text-sm text-secondary">Upload failed</div>
      )}
      <ButtonPrimary
        compact
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          retry();
        }}
      >
        Retry
      </ButtonPrimary>
    </div>
  );
}
