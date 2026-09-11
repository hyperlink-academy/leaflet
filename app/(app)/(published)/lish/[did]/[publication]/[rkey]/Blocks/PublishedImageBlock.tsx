"use client";

import { useState } from "react";
import { ReadOnlyAltText } from "components/Blocks/ReadOnlyAltText";
import { ImageErrorState, useImageLoadStatus } from "components/ImageLoadState";
import { POST_BODY_SIZES } from "src/utils/blobRefToSrc";

export function PublishedImageBlock(props: {
  src: string;
  srcSet?: string;
  alt?: string;
  width?: number;
  height?: number;
  displayWidth?: number;
  isFullBleed?: boolean;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high";
  onOpenLightbox?: () => void;
  onOpenAltInLightbox?: () => void;
}) {
  let [reloads, setReloads] = useState(0);
  let bustCache = (url: string) =>
    reloads === 0
      ? url
      : `${url}${url.includes("?") ? "&" : "?"}reload=${reloads}`;
  let src = bustCache(props.src);
  // Every candidate needs the same cache-bust, or a retry re-requests only
  // `src` while the browser keeps serving the broken cached srcset entry.
  let srcSet = props.srcSet
    ?.split(", ")
    .map((entry) => {
      let [url, descriptor] = entry.split(" ");
      return `${bustCache(url)} ${descriptor}`;
    })
    .join(", ");
  let { status, imgProps, reset } = useImageLoadStatus(src);

  let imageStyle =
    !props.isFullBleed && props.displayWidth
      ? { width: props.displayWidth, maxWidth: "100%", height: "auto" as const }
      : undefined;

  return (
    <div
      className={`relative ${props.isFullBleed ? "w-full" : "w-fit"} h-fit ${status === "error" ? "min-w-40 min-h-24" : ""}`}
    >
      <button
        type="button"
        className={`block ${props.isFullBleed ? "w-full" : "w-fit"} ${props.onOpenLightbox ? "cursor-pointer" : ""}`}
        onClick={props.onOpenLightbox}
      >
        <img
          {...imgProps}
          alt={props.alt ?? ""}
          loading={props.loading}
          fetchPriority={props.fetchPriority}
          decoding="async"
          height={props.height}
          width={props.width}
          className={`${props.isFullBleed ? "w-full border-none" : "rounded-lg border border-transparent "}  ${props.className ?? ""}`}
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? POST_BODY_SIZES : undefined}
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
      {props.alt && (
        <ReadOnlyAltText
          alt={props.alt}
          onSeeMore={props.onOpenAltInLightbox}
        />
      )}
    </div>
  );
}
