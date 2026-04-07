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
      console.log("[parts.page] disposing RPC session");
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
          handlersRef.current.onOpen(url);
        },
        onReplaceWith: (block) => {
          console.log("[parts.page] replaceWith command from", src, block);
          handlersRef.current.onReplaceWith(block);
        },
        onAddBelow: (block) => {
          console.log("[parts.page] addBelow command from", src, block);
          handlersRef.current.onAddBelow(block);
        },
      });

      console.log("[parts.page] creating RPC session for", src);
      try {
        sessionRef.current = newMessagePortRpcSession(port1, host);
        console.log("[parts.page] RPC session created", {
          src,
          session: sessionRef.current,
        });
      } catch (e) {
        console.error("[parts.page] RPC session creation failed", src, e);
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
