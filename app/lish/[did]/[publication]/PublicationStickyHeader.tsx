"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PublicationStickyHeader(props: {
  sticky?: boolean;
  scrollContainerSelector?: string;
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  let ref = useRef<HTMLDivElement>(null);
  let pathname = usePathname();
  let sticky = props.sticky ?? true;
  let selector = props.scrollContainerSelector;

  useEffect(() => {
    let el = ref.current;
    let parent = el?.parentElement;
    if (!el || !parent) return;

    let rafId: number | null = null;
    let writeProgress = (target: HTMLElement) => {
      let p = Math.min(Math.max(target.scrollTop / 100, 0), 1);
      el!.style.setProperty("--header-shrink", String(p));
    };
    let schedule = (target: HTMLElement) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        writeProgress(target);
      });
    };

    if (selector) {
      let onScroll = (e: Event) => {
        let t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (!t.matches(selector)) return;
        schedule(t);
      };
      parent.addEventListener("scroll", onScroll, {
        passive: true,
        capture: true,
      });
      let initial = parent.querySelector(selector) as HTMLElement | null;
      if (initial) writeProgress(initial);
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        parent.removeEventListener("scroll", onScroll, true);
      };
    }

    let p: HTMLElement | null = parent;
    while (p && p !== document.body) {
      let s = getComputedStyle(p);
      if (s.overflowY === "auto" || s.overflowY === "scroll") break;
      p = p.parentElement;
    }
    if (!p || p === document.body) return;
    let target = p;
    let onScroll = () => schedule(target);
    target.addEventListener("scroll", onScroll, { passive: true });
    writeProgress(target);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      target.removeEventListener("scroll", onScroll);
    };
  }, [selector]);

  useEffect(() => {
    ref.current?.style.setProperty("--header-shrink", "0");
  }, [pathname]);

  return (
    <div
      ref={ref}
      className={
        sticky
          ? "pubStickyHeader sticky top-0 z-10 bg-bg-page shrink-0"
          : "pubStickyHeader shrink-0"
      }
    >
      <div
        className="sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4"
        style={{
          paddingTop: "calc(20px - 20px * var(--header-shrink, 0))",
        }}
      >
        {props.children}
      </div>
      {props.nav}
    </div>
  );
}
