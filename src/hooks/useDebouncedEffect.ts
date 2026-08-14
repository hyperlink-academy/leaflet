import { useEffect } from "react";

export function useDebouncedEffect(
  fn: (isCancelled: () => boolean) => void,
  delay: number,
  deps: React.DependencyList = [],
): void {
  useEffect(() => {
    let cancelled = false;
    const handler = setTimeout(() => {
      fn(() => cancelled);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
