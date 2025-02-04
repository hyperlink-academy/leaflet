"use client";
import { isIOS, useViewportSize } from "@react-aria/utils";
import { useEffect, useState } from "react";

export function ViewportSizeLayout(props: { children: React.ReactNode }) {
  let viewheight = useViewportSize().height;
  let difference = useViewportDifference();
  return (
    <div
      style={{
        height: isIOS()
          ? `calc(${viewheight}px + env(safe-area-inset-top)`
          : "calc(100% + env(safe-area-inset-top)",
      }}
    >
      {props.children}
    </div>
  );
}

function useViewportDifference(): number {
  let [difference, setDifference] = useState(0);

  useEffect(() => {
    // Use visualViewport api to track available height even on iOS virtual keyboard opening
    let onResize = () => {
      setDifference(window.innerHeight - getViewportSize().height);
    };

    if (!visualViewport) {
      window.addEventListener("resize", onResize);
    } else {
      visualViewport.addEventListener("resize", onResize);
    }

    return () => {
      if (!visualViewport) {
        window.removeEventListener("resize", onResize);
      } else {
        visualViewport.removeEventListener("resize", onResize);
      }
    };
  }, []);

  return difference;
}

function getViewportSize() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return {
    width: visualViewport?.width || window?.innerWidth,
    height: visualViewport?.height || window?.innerHeight,
  };
}
