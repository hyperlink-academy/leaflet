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
  hasPageBackground?: boolean;
  getAnchorSelector: (item: T) => string;
  renderItem: (item: T & { top: number }) => ReactNode;
}) {
  let containerRef = useRef<HTMLDivElement>(null);
  let innerRef = useRef<HTMLDivElement>(null);
  let [positions, setPositions] = useState<(T & { top: number })[]>([]);
  let [scrollOffset, setScrollOffset] = useState(0);

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
    setScrollOffset(scrollTop);

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

    let onScroll = () => {
      setScrollOffset(scrollWrapper!.scrollTop);
    };

    scrollWrapper.addEventListener("scroll", onScroll);

    let resizeObserver = new ResizeObserver(calculatePositions);
    resizeObserver.observe(scrollWrapper);

    let mutationObserver = new MutationObserver(calculatePositions);
    mutationObserver.observe(scrollWrapper, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      scrollWrapper!.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [props.visible, calculatePositions]);

  if (!props.visible || props.items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`footnote-side-column hidden lg:block absolute top-0 w-[200px] pointer-events-none ${
        props.fullPageScroll
          ? "left-[calc(50%+var(--page-width-units)/2+12px)]"
          : "left-full ml-3"
      }`}
      style={{ height: "100%" }}
    >
      <div
        ref={innerRef}
        className="relative pointer-events-auto"
        style={{ transform: `translateY(-${scrollOffset}px)` }}
      >
        {positions.map((item) => (
          <SideItem key={item.id} id={item.id} top={item.top} onResize={calculatePositions} hasPageBackground={props.hasPageBackground}>
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
  onResize: () => void;
  hasPageBackground?: boolean;
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

    let ro = new ResizeObserver(() => {
      check();
      props.onResize();
    });
    ro.observe(el);

    let mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [props.onResize]);

  return (
    <div
      ref={ref}
      data-footnote-side-id={props.id}
      className={`absolute left-0 right-0 text-sm footnote-side-enter footnote-side-item${overflows ? " has-overflow" : ""}${isFocused ? " footnote-side-focused" : ""}${props.hasPageBackground ? ` has-page-bg bg-bg-page rounded-md px-2 py-1 hover:[&_.grow]:line-clamp-none focus-within:[&_.grow]:line-clamp-none${!isFocused ? " [&_.grow]:line-clamp-3" : ""}` : ""}`}
      style={{ top: props.top }}
    >
      {props.children}
    </div>
  );
}
