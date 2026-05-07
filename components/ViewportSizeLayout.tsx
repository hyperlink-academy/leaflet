"use client";
import { useEffect, useState } from "react";
import { isIOS } from "src/utils/isDevice";

type VisualViewportState = {
  width: number;
  height: number;
  offsetTop: number;
  difference: number;
};

function getVisualViewport(): VisualViewportState {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, offsetTop: 0, difference: 0 };
  }
  let height = visualViewport?.height || window.innerHeight;
  return {
    width: visualViewport?.width || window.innerWidth,
    height,
    offsetTop: visualViewport?.offsetTop || 0,
    difference: window.innerHeight - height,
  };
}

export function useVisualViewport(): VisualViewportState {
  let [state, setState] = useState(getVisualViewport);

  useEffect(() => {
    let onResize = () => {
      setState((prev) => {
        let next = getVisualViewport();
        if (
          prev.width === next.width &&
          prev.height === next.height &&
          prev.offsetTop === next.offsetTop
        ) {
          return prev;
        }
        return next;
      });
    };

    let target: VisualViewport | Window = visualViewport || window;
    target.addEventListener("resize", onResize);
    return () => target.removeEventListener("resize", onResize);
  }, []);

  return state;
}

export function ViewportSizeLayout(props: { children: React.ReactNode }) {
  let { height, difference } = useVisualViewport();
  return (
    <div
      style={{
        height:
          isIOS() && difference !== 0
            ? `calc(${height}px + 10px)`
            : "calc(100% + env(safe-area-inset-top))",
      }}
    >
      {props.children}
    </div>
  );
}
