import { useEffect, useState, useRef } from "react";

export function useDebouncedEffect(
  fn: () => void,
  delay: number,
  deps: React.DependencyList = [],
): void {
  useEffect(() => {
    const handler = setTimeout(() => {
      fn();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
