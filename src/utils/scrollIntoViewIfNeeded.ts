export function scrollIntoViewIfNeeded(
  el: Element | null,
  centerIfNeeded: boolean = true,
  behavior?: ScrollBehavior,
  rootBottomMargin?: number,
) {
  if (!el) {
    return;
  }

  let observer = new IntersectionObserver(
    function ([entry]) {
      const ratio = entry.intersectionRatio;
      if (ratio < 1) {
        let place =
          ratio <= 0 && centerIfNeeded
            ? ("center" as const)
            : ("nearest" as const);
        el.scrollIntoView({
          block: place,
          inline: place,
          behavior: behavior ? behavior : "auto",
        });

        // If rootBottomMargin is defined, adjust scroll position to keep element away from bottom
        if (rootBottomMargin) {
          requestAnimationFrame(() => {
            let rect = el.getBoundingClientRect();
            let scrollContainer = getScrollParent(el);
            let scrollContainerHeight = scrollContainer.clientHeight;
            let distanceFromBottom = scrollContainerHeight - rect.bottom;
            scrollContainer.scrollBy({
              top: Math.abs(rootBottomMargin + distanceFromBottom),
              behavior: behavior ? behavior : "auto",
            });
          });
        }
      }
      observer.disconnect();
    },
    {
      rootMargin: rootBottomMargin
        ? `0px 0px ${rootBottomMargin}px 0px`
        : "0px",
    },
  );
  observer.observe(el);
}

function getScrollParent(el: Element) {
  let parent = el.parentElement;

  while (parent) {
    const { overflow, overflowY } = window.getComputedStyle(parent);

    if (
      overflow === "auto" ||
      overflow === "scroll" ||
      overflowY === "auto" ||
      overflowY === "scroll"
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }
  return document.documentElement;
}
