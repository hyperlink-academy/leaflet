import { useState, useEffect } from "react";

export function useIsMobile() {
  const { width } = useWindowDimensions();
  return width < 640 || width === 0;
}

export function useIsInitialRender() {
  let [state, setState] = useState(true);
  useEffect(() => setState(false), []);
  return state;
}

function getWindowDimensions() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

export function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions(),
  );

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowDimensions;
}
