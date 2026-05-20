"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PublicationStickyHeader(props: {
  sticky?: boolean;
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  let ref = useRef<HTMLDivElement>(null);
  let pathname = usePathname();
  let sticky = props.sticky ?? true;

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

    let onScroll = (e: Event) => {
      let t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!t.matches(".publicationScrollContainer")) return;
      schedule(t);
    };
    parent.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });

    let initial = (
      parent.matches(".publicationScrollContainer")
        ? parent
        : parent.querySelector(".publicationScrollContainer")
    ) as HTMLElement | null;
    if (initial) writeProgress(initial);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      parent.removeEventListener("scroll", onScroll, true);
    };
  }, []);

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
