import { useEffect, useRef, useState, useCallback } from "react";
import { useFootnoteContext } from "./FootnoteContext";
import { FootnoteEditor } from "./FootnoteEditor";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { deleteFootnoteFromBlock } from "./deleteFootnoteFromBlock";

type PositionedFootnote = {
  footnoteEntityID: string;
  blockID: string;
  index: number;
  top: number;
};

const GAP = 4;

export function FootnoteSideColumn(props: {
  pageEntityID: string;
  visible: boolean;
}) {
  let { footnotes } = useFootnoteContext();
  let { permissions } = useEntitySetContext();
  let rep = useReplicache();
  let containerRef = useRef<HTMLDivElement>(null);
  let innerRef = useRef<HTMLDivElement>(null);
  let [positions, setPositions] = useState<PositionedFootnote[]>([]);
  let [scrollOffset, setScrollOffset] = useState(0);

  let calculatePositions = useCallback(() => {
    let container = containerRef.current;
    let inner = innerRef.current;
    if (!container || !inner || footnotes.length === 0) {
      setPositions([]);
      return;
    }

    let scrollWrapper = container.closest(".pageWrapper")
      ?.querySelector(".pageScrollWrapper") as HTMLElement | null;
    if (!scrollWrapper) return;

    let scrollTop = scrollWrapper.scrollTop;
    let scrollWrapperRect = scrollWrapper.getBoundingClientRect();
    setScrollOffset(scrollTop);

    // Phase 1: Batch read — measure all anchor positions and item heights
    let measurements: {
      footnoteEntityID: string;
      blockID: string;
      index: number;
      anchorTop: number;
      height: number;
    }[] = [];

    for (let fn of footnotes) {
      let supEl = scrollWrapper.querySelector(
        `.footnote-ref[data-footnote-id="${fn.footnoteEntityID}"]`,
      ) as HTMLElement | null;
      if (!supEl) continue;

      let supRect = supEl.getBoundingClientRect();
      let anchorTop = supRect.top - scrollWrapperRect.top + scrollTop;

      // Measure actual rendered height of the side item element
      let itemEl = inner.querySelector(
        `[data-footnote-side-id="${fn.footnoteEntityID}"]`,
      ) as HTMLElement | null;
      let height = itemEl ? itemEl.offsetHeight : 54; // fallback for first render

      measurements.push({
        footnoteEntityID: fn.footnoteEntityID,
        blockID: fn.blockID,
        index: fn.index,
        anchorTop,
        height,
      });
    }

    // Phase 2: Resolve collisions using measured heights
    let resolved: PositionedFootnote[] = [];
    let nextAvailableTop = 0;
    for (let m of measurements) {
      let top = Math.max(m.anchorTop, nextAvailableTop);
      resolved.push({
        footnoteEntityID: m.footnoteEntityID,
        blockID: m.blockID,
        index: m.index,
        top,
      });
      nextAvailableTop = top + m.height + GAP;
    }

    // Phase 3: Batch write — set positions via state update (React handles DOM writes)
    setPositions(resolved);
  }, [footnotes]);

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

  if (!props.visible || footnotes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="footnote-side-column hidden lg:block absolute top-0 left-full w-[200px] ml-3 pointer-events-none"
      style={{ height: "100%" }}
    >
      <div
        ref={innerRef}
        className="relative pointer-events-auto"
        style={{ transform: `translateY(-${scrollOffset}px)` }}
      >
        {positions.map((fn) => (
          <FootnoteSideItem
            key={fn.footnoteEntityID}
            footnoteEntityID={fn.footnoteEntityID}
            top={fn.top}
            onResize={calculatePositions}
          >
            <FootnoteEditor
              footnoteEntityID={fn.footnoteEntityID}
              index={fn.index}
              editable={permissions.write}
              onDelete={
                permissions.write
                  ? () => deleteFootnoteFromBlock(fn.footnoteEntityID, fn.blockID, rep.rep)
                  : undefined
              }
            />
          </FootnoteSideItem>
        ))}
      </div>
    </div>
  );
}

function FootnoteSideItem(props: {
  children: React.ReactNode;
  footnoteEntityID: string;
  top: number;
  onResize: () => void;
}) {
  let ref = useRef<HTMLDivElement>(null);
  let [overflows, setOverflows] = useState(false);

  useEffect(() => {
    let el = ref.current;
    if (!el) return;

    let check = () => setOverflows(el!.scrollHeight > el!.clientHeight + 1);
    check();

    // Watch for content changes (text edits)
    let mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    // Watch for size changes (expand/collapse on hover) and trigger reflow
    let ro = new ResizeObserver(() => {
      check();
      props.onResize();
    });
    ro.observe(el);

    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [props.onResize]);

  return (
    <div
      ref={ref}
      data-footnote-side-id={props.footnoteEntityID}
      className={`absolute left-0 right-0 text-xs footnote-side-enter footnote-side-item${overflows ? " has-overflow" : ""}`}
      style={{ top: props.top }}
    >
      {props.children}
    </div>
  );
}
