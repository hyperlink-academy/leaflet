import { useEffect, useRef, useState } from "react";

// Kicks off the card screenshot (a slow browser render) the moment the share
// modal opens (`enabled`), so it's ready by the time the user finishes
// composing. `promiseRef` resolves to the base64 webp handed to the publish
// action (null on failure); `previewSrc` is an object URL for the compose card
// preview once the image lands.
export function usePrefetchedScreenshot(
  url: string | undefined,
  enabled: boolean,
) {
  let promiseRef = useRef<Promise<string | null> | null>(null);
  let [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !url) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    promiseRef.current = fetch(
      `/api/quote_screenshot?url=${encodeURIComponent(url)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        let blob = await res.blob();
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setPreviewSrc(objectUrl);
        }
        return blobToBase64(blob);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
      promiseRef.current = null;
      setPreviewSrc(null);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, enabled]);

  return { promiseRef, previewSrc };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    // reader.result is a data: URL; the base64 payload follows the comma.
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
