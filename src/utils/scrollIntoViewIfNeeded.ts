export function scrollIntoViewIfNeeded(
  el: Element | null,
  centerIfNeeded: boolean = true,
  behavior?: ScrollBehavior,
  threshold: number = 1,
) {
  if (!el) {
    return;
  }
  // The editor renders in different scroll contexts. A context marks its
  // scroller with `.editorScrollRoot` and any chrome pinned to the top of it
  // (e.g. a sticky nav) with `.editorScrollStickyHeader`. We look those up
  // relative to the element so visibility is measured against the real scroller
  // and focused blocks don't land underneath the sticky chrome. With no marked
  // ancestor — e.g. the leaflet carousel, where each page scrolls itself
  // against the viewport — we fall back to the viewport with no inset, which is
  // the original behavior.
  let scrollContainer = el.closest<HTMLElement>(".editorScrollRoot");
  let stickyHeader =
    scrollContainer?.querySelector<HTMLElement>(".editorScrollStickyHeader") ??
    null;
  let topInset = stickyHeader?.offsetHeight ?? 0;
  let observer = new IntersectionObserver(
    function ([entry]) {
      const ratio = entry.intersectionRatio;

      if (ratio < threshold) {
        let place =
          ratio <= 0 && centerIfNeeded
            ? ("center" as const)
            : ("nearest" as const);
        // scroll-margin-top keeps the block clear of the sticky header. It's
        // only consumed by this scrollIntoView call, so set it just for the call.
        let element = el as HTMLElement;
        let previousScrollMargin = element.style.scrollMarginTop;
        if (topInset) element.style.scrollMarginTop = `${topInset}px`;
        el.scrollIntoView({
          block: place,
          inline: place,
          behavior: behavior ? behavior : "auto",
        });
        element.style.scrollMarginTop = previousScrollMargin;
      }
      observer.disconnect();
    },
    {
      root: scrollContainer,
      // Shrink the observed area by the sticky header so a block hidden behind
      // it counts as not-visible and gets scrolled into the clear.
      rootMargin: topInset ? `-${topInset}px 0px 0px 0px` : undefined,
      threshold: [0, threshold],
    },
  );
  observer.observe(el);
}
