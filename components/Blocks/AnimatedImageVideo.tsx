"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Plays the video rendition of an animated GIF in place of the GIF. The GIF
 * <img> (children) stays on screen until the video can play, and stays for
 * good if the video fails (no rendition, unsupported codec), so nothing is
 * ever blank. Once the video shows, the GIF is unmounted so its frames stop
 * being decoded.
 */
export function AnimatedImageVideo(props: {
  videoSrc?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  let [state, setState] = useState<"loading" | "playing" | "failed">(
    "loading",
  );
  let ref = useRef<HTMLVideoElement>(null);
  // React does not reflect `muted` to the attribute, and an unmuted video is
  // not allowed to autoplay.
  useEffect(() => {
    let video = ref.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    // autoplay may already have been refused before `muted` was set. A refusal
    // (low power mode, autoplay disabled) keeps the GIF, which still animates.
    video
      .play()
      .then(() => setState("playing"))
      .catch(() => setState("failed"));
  }, [props.videoSrc]);
  if (!props.videoSrc || state === "failed") return <>{props.children}</>;
  return (
    <>
      {state === "loading" && props.children}
      <video
        ref={ref}
        src={props.videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={props.alt}
        width={props.width}
        height={props.height}
        className={state === "playing" ? props.className : "hidden"}
        style={state === "playing" ? props.style : undefined}
        onPlaying={() => setState("playing")}
        onError={() => setState("failed")}
      />
    </>
  );
}
