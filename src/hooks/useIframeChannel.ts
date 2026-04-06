import { useCallback, useEffect, useRef } from "react";
import { newMessagePortRpcSession } from "capnweb";
import { PartsPageHost } from "src/partsPageChannel";

export function useIframeChannel(options: { onOpen: (url: string) => void }) {
  let iframeElRef = useRef<HTMLIFrameElement | null>(null);
  let onOpenRef = useRef(options.onOpen);
  onOpenRef.current = options.onOpen;

  let sessionRef = useRef<ReturnType<
    typeof newMessagePortRpcSession
  > | null>(null);

  let cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current[Symbol.dispose]();
      sessionRef.current = null;
    }
  }, []);

  let handleMessage = useCallback(
    (event: MessageEvent) => {
      let iframe = iframeElRef.current;
      if (!iframe?.contentWindow) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== "parts.page.connect") return;

      cleanup();

      let src = iframe.src;
      console.log("[parts.page] connect request from", src);

      let { port1, port2 } = new MessageChannel();

      let host = new PartsPageHost({
        onOpen: (url) => {
          console.log("[parts.page] open command from", src, url);
          onOpenRef.current(url);
        },
      });

      sessionRef.current = newMessagePortRpcSession(port1, host);
      console.log("[parts.page] channel established with", src);

      iframe.contentWindow.postMessage({ type: "parts.page.channel" }, "*", [
        port2,
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
      iframeElRef.current = el;
    },
    [],
  );

  return { iframeRef };
}
