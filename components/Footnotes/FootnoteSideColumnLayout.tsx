"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useUIState } from "src/useUIState";

export type FootnoteSideItem = {
  id: string;
  index: number;
};

const GAP = 4;

export function FootnoteSideColumnLayout<T extends FootnoteSideItem>(props: {
  items: T[];
  visible: boolean;
  fullPageScroll?: boolean;
  getAnchorSelector: (item: T) => string;
  renderItem: (item: T & { top: number }) => ReactNode;
}) {
  let containerRef = useRef<HTMLDivElement>(null);
  let innerRef = useRef<HTMLDivElement>(null);
  let [positions, setPositions] = useState<(T & { top: number })[]>([]);

  let calculatePositions = useCallback(() => {
    let container = containerRef.current;
    let inner = innerRef.current;
    if (!container || !inner || props.items.length === 0) {
      setPositions([]);
      return;
    }

    let scrollWrapper = container.closest(".pageWrapper")
      ?.querySelector(".pageScrollWrapper") as HTMLElement | null;
    if (!scrollWrapper) return;

    let scrollTop = scrollWrapper.scrollTop;
    let scrollWrapperRect = scrollWrapper.getBoundingClientRect();

    // Sync scroll transform directly on the DOM (no React re-render)
    inner.style.transform = `translateY(-${scrollTop}px)`;

    let measurements: (T & { anchorTop: number; height: number })[] = [];

    for (let item of props.items) {
      let supEl = scrollWrapper.querySelector(
        props.getAnchorSelector(item),
      ) as HTMLElement | null;
      if (!supEl) continue;

      let supRect = supEl.getBoundingClientRect();
      let anchorTop = supRect.top - scrollWrapperRect.top + scrollTop;

      let itemEl = inner.querySelector(
        `[data-footnote-side-id="${item.id}"]`,
      ) as HTMLElement | null;
      let height = itemEl ? itemEl.offsetHeight : 54;

      measurements.push({ ...item, anchorTop, height });
    }

    let resolved: (T & { top: number })[] = [];
    let nextAvailableTop = 0;
    for (let m of measurements) {
      let top = Math.max(m.anchorTop, nextAvailableTop);
      resolved.push({
        ...m,
        top,
      });
      nextAvailableTop = top + m.height + GAP;
    }

    setPositions(resolved);
  }, [props.items, props.getAnchorSelector]);

  useEffect(() => {
    if (!props.visible) return;
    calculatePositions();

    let scrollWrapper = containerRef.current?.closest(".pageWrapper")
      ?.querySelector(".pageScrollWrapper") as HTMLElement | null;
    if (!scrollWrapper) return;

    // On scroll, update the transform directly without React re-render
    let onScroll = () => {
      let inner = innerRef.current;
      if (inner) {
        inner.style.transform = `translateY(-${scrollWrapper!.scrollTop}px)`;
      }
    };

    scrollWrapper.addEventListener("scroll", onScroll, { passive: true });

    // Forward wheel events from the side column to the scroll wrapper
    let container = containerRef.current!;
    let onWheel = (e: WheelEvent) => {
      scrollWrapper!.scrollTop += e.deltaY;
    };
    container.addEventListener("wheel", onWheel, { passive: true });

    let resizeObserver = new ResizeObserver(calculatePositions);
    resizeObserver.observe(scrollWrapper);

    // Observe all side items so positions recalculate when their heights change
    let observeSideItems = () => {
      let inner = innerRef.current;
      if (!inner) return;
      for (let el of inner.querySelectorAll("[data-footnote-side-id]")) {
        resizeObserver.observe(el);
      }
    };
    observeSideItems();

    let mutationObserver = new MutationObserver(() => {
      calculatePositions();
      // Re-observe in case new items were added
      observeSideItems();
    });
    mutationObserver.observe(scrollWrapper, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Also observe the inner container so we recalculate when side items
    // are added/removed (they're siblings of scrollWrapper, not children)
    let innerEl = innerRef.current;
    if (innerEl) {
      mutationObserver.observe(innerEl, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      scrollWrapper!.removeEventListener("scroll", onScroll);
      container.removeEventListener("wheel", onWheel);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [props.visible, calculatePositions]);

  if (!props.visible || props.items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`footnote-side-column hidden lg:block absolute top-0 w-[200px] ${
        props.fullPageScroll
          ? "left-[calc(50%+var(--page-width-units)/2+12px)]"
          : "left-full ml-3"
      }`}
      style={{ height: "100%" }}
    >
      <div
        ref={innerRef}
        className="relative"
      >
        {positions.map((item) => (
          <SideItem key={item.id} id={item.id} top={item.top}>
            {props.renderItem(item)}
          </SideItem>
        ))}
      </div>
    </div>
  );
}

function SideItem(props: {
  children: ReactNode;
  id: string;
  top: number;
}) {
  let ref = useRef<HTMLDivElement>(null);
  let [overflows, setOverflows] = useState(false);
  let isFocused = useUIState(
    (s) =>
      s.focusedEntity?.entityType === "footnote" &&
      s.focusedEntity.entityID === props.id,
  );

  useEffect(() => {
    let el = ref.current;
    if (!el) return;

    let check = () => setOverflows(el!.scrollHeight > el!.clientHeight + 1);
    check();

    let mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      mo.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-footnote-side-id={props.id}
      className={`absolute left-0 right-0 text-sm footnote-side-enter footnote-side-item${overflows ? " has-overflow" : ""}${isFocused ? " footnote-side-focused" : ""}`}
      style={{ top: props.top }}
    >
      {props.children}
    </div>
  );
}
