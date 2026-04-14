import { useCallback, useEffect, useRef } from "react";
import { newMessagePortRpcSession } from "capnweb";
import { PartsPageHost, PartsPageHandlers } from "src/partsPageChannel";

export function useIframeChannel(options: PartsPageHandlers) {
  let iframeElRef = useRef<HTMLIFrameElement | null>(null);
  let handlersRef = useRef(options);
  handlersRef.current = options;

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

      let { port1, port2 } = new MessageChannel();

      let host = new PartsPageHost({
        onOpen: (url) => handlersRef.current.onOpen(url),
        onReplaceWith: (block) => handlersRef.current.onReplaceWith(block),
        onAddBelow: (block) => handlersRef.current.onAddBelow(block),
      });

      try {
        sessionRef.current = newMessagePortRpcSession(port1, host);
      } catch (e) {
        console.error("[parts.page] RPC session creation failed", e);
        throw e;
      }

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
