import { useCallback, useEffect, useRef } from "react";

export function useIframeChannel(options: { onOpen: (url: string) => void }) {
  let portRef = useRef<MessagePort | null>(null);
  let iframeElRef = useRef<HTMLIFrameElement | null>(null);
  let onOpenRef = useRef(options.onOpen);
  onOpenRef.current = options.onOpen;

  let cleanup = useCallback(() => {
    if (portRef.current) {
      portRef.current.close();
      portRef.current = null;
    }
  }, []);

  let handleMessage = useCallback(
    (event: MessageEvent) => {
      let iframe = iframeElRef.current;
      if (!iframe?.contentWindow) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== "parts.page.connect") return;

      let src = iframe.src;
      console.log("[parts.page] connect request from", src);

      cleanup();

      let channel = new MessageChannel();
      portRef.current = channel.port1;

      channel.port1.onmessage = (e) => {
        let data = e.data;
        if (
          !data ||
          typeof data !== "object" ||
          typeof data.command !== "string"
        ) {
          console.warn("[parts.page] invalid message from", src, data);
          return;
        }

        console.log("[parts.page] command from", src, data);

        switch (data.command) {
          case "open": {
            if (typeof data.url === "string") {
              onOpenRef.current(data.url);
            }
            break;
          }
        }
      };

      console.log("[parts.page] channel established with", src);
      iframe.contentWindow.postMessage({ type: "parts.page.channel" }, "*", [
        channel.port2,
      ]);
    },
    [cleanup],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      cleanup();
    };
  }, [handleMessage, cleanup]);

  let iframeRef = useCallback(
    (el: HTMLIFrameElement | null) => {
      if (iframeElRef.current) {
        cleanup();
      }
      iframeElRef.current = el;
    },
    [cleanup],
  );

  return { iframeRef };
}
