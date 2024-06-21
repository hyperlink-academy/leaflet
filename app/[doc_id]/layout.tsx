"use client";
import { isIOS, useViewportSize } from "@react-aria/utils";
import { usePreventScroll } from "@react-aria/overlays";
import { useEffect, useState } from "react";
import { TextToolbar } from "app/test/TextToolbar";

export default function Layout(props: { children: React.ReactNode }) {
  let viewheight = useViewportSize().height;
  let difference = useViewportDifference();

  usePreventScroll();
  return (
    <div
      style={
        !isIOS()
          ? undefined
          : difference === 0
            ? undefined
            : { height: viewheight }
      }
    >
      {props.children}
    </div>
  );
}

export function useViewportDifference(): number {
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
