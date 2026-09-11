import { useCallback, useEffect, useRef } from "react";
import type { newMessagePortRpcSession } from "capnweb";
import type { PartsPageHandlers } from "src/partsPageChannel";

export function useIframeChannel(options: PartsPageHandlers) {
  let iframeElRef = useRef<HTMLIFrameElement | null>(null);
  let handlersRef = useRef(options);
  handlersRef.current = options;

  let sessionRef = useRef<ReturnType<typeof newMessagePortRpcSession> | null>(
    null,
  );

  let cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current[Symbol.dispose]();
      sessionRef.current = null;
    }
  }, []);

  // capnweb and the RPC host load with the first embed that actually connects,
  // rather than with every page that can hold one.
  let handleMessage = useCallback(
    async (event: MessageEvent) => {
      let iframe = iframeElRef.current;
      if (!iframe?.contentWindow) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== "parts.page.connect") return;

      cleanup();

      let [{ newMessagePortRpcSession }, { PartsPageHost }] = await Promise.all(
        [import("capnweb"), import("src/partsPageChannel")],
      );
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

  let iframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeElRef.current = el;
  }, []);

  return { iframeRef };
}
