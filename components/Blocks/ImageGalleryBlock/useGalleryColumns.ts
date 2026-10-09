import { useEffect, useRef, useState } from "react";

export function useGalleryColumns(props: {
  count: number;
  gap: number;
  maxWidth: number;
}) {
  let containerRef = useRef<HTMLDivElement>(null);
  let [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    let el = containerRef.current;
    if (!el) return;
    let observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let columns =
    containerWidth > 0
      ? Math.max(
          1,
          Math.min(
            Math.ceil(
              (containerWidth - 1 + props.gap) / (props.maxWidth + props.gap),
            ),
            props.count,
          ),
        )
      : Math.min(props.count, 3);

  let layoutMaxWidth =
    containerWidth > 0
      ? columns * props.maxWidth + (columns - 1) * props.gap
      : undefined;

  return { containerRef, columns, layoutMaxWidth };
}
