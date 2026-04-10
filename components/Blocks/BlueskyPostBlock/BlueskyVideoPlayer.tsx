import { useEffect, useRef, useState } from "react";

type Props = {
  playlist: string;
  thumbnail?: string;
  alt?: string;
  aspectRatio: number;
  className?: string;
};

export const BlueskyVideoPlayer = (props: Props) => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!playing) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    // Safari (and some iOS browsers) support HLS natively.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = props.playlist;
      video.play().catch(() => {});
      return () => {
        cancelled = true;
        video.removeAttribute("src");
        video.load();
      };
    }

    setLoading(true);
    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          // Last-resort fallback: try the native element anyway.
          video.src = props.playlist;
          video.play().catch(() => {});
          setLoading(false);
          return;
        }
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(props.playlist);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          setLoading(false);
          video.play().catch(() => {});
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playing, props.playlist]);

  return (
    <div
      className={`videoEmbed rounded-md overflow-hidden relative w-full ${props.className || ""}`}
      style={{ aspectRatio: String(props.aspectRatio) }}
    >
      {!playing && props.thumbnail && (
        <img
          src={props.thumbnail}
          alt={props.alt || "Video thumbnail"}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {playing && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover bg-black"
          controls
          playsInline
          poster={props.thumbnail}
        />
      )}
      {!playing && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPlaying(true);
          }}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center group"
        >
          <div className="absolute inset-0 bg-primary opacity-40 group-hover:opacity-30 transition-opacity" />
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-bg-page/90 group-hover:bg-bg-page transition-colors">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 ml-1"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white text-xs italic">Loading…</div>
        </div>
      )}
    </div>
  );
};
