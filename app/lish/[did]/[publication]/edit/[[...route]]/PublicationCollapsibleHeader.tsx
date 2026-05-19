"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PublicationCollapsibleHeader(props: {
  children: React.ReactNode;
}) {
  let ref = useRef<HTMLDivElement>(null);
  let pathname = usePathname();

  useEffect(() => {
    let el = ref.current;
    let parent = el?.parentElement;
    if (!el || !parent) return;

    let rafId: number | null = null;

    let onScroll = (e: Event) => {
      let target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("pageScrollWrapper")) return;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!el) return;
        let height = el.offsetHeight;
        let collapsed = Math.max(0, Math.min(target.scrollTop, height));
        el.style.marginTop = `-${collapsed}px`;
      });
    };

    parent.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      parent.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.style.marginTop = "";
  }, [pathname]);

  return (
    <div
      ref={ref}
      className="px-3 sm:px-4 pt-5 w-full sm:max-w-(--page-width-units) mx-auto shrink-0"
    >
      {props.children}
    </div>
  );
}
