"use client";

import { useState } from "react";
import { ReadOnlyAltText } from "components/Blocks/ReadOnlyAltText";
import { ImageErrorState, useImageLoadStatus } from "components/ImageLoadState";

export function PublishedImageBlock(props: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  displayWidth?: number;
  isFullBleed?: boolean;
  className?: string;
  onOpenLightbox?: () => void;
}) {
  // Reloading has to change the URL: re-rendering the same src would be handed
  // the failed response straight back out of the browser's cache.
  let [reloads, setReloads] = useState(0);
  let src =
    reloads === 0
      ? props.src
      : `${props.src}${props.src.includes("?") ? "&" : "?"}reload=${reloads}`;
  let { status, imgProps, reset } = useImageLoadStatus(src);

  let imageStyle =
    !props.isFullBleed && props.displayWidth
      ? { width: props.displayWidth, maxWidth: "100%", height: "auto" as const }
      : undefined;

  return (
    <div
      // A broken image collapses to the size of its alt text, so the frame
      // holds a floor of its own for that render.
      className={`relative ${props.isFullBleed ? "w-full" : "w-fit"} h-fit ${status === "error" ? "min-w-40 min-h-24" : ""}`}
    >
      <button
        type="button"
        className={`block ${props.isFullBleed ? "w-full" : "w-fit"} ${props.onOpenLightbox ? "cursor-pointer" : ""}`}
        onClick={props.onOpenLightbox}
      >
        <img
          {...imgProps}
          alt={props.alt}
          height={props.height}
          width={props.width}
          className={`${props.isFullBleed ? "w-full border-none" : "rounded-lg border border-transparent "}  ${props.className ?? ""}`}
          src={src}
          style={imageStyle}
        />
      </button>
      {status === "error" && (
        <ImageErrorState
          message="Something went wrong,"
          actionLabel="reload?"
          onAction={() => {
            reset();
            setReloads((r) => r + 1);
          }}
          className={props.isFullBleed ? "rounded-none!" : "rounded-lg!"}
        />
      )}
      {props.alt && <ReadOnlyAltText alt={props.alt} />}
    </div>
  );
}
