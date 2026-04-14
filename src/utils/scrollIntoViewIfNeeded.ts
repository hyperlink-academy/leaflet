export function scrollIntoViewIfNeeded(
  el: Element | null,
  centerIfNeeded: boolean = true,
  behavior?: ScrollBehavior,
  threshold: number = 1,
) {
  if (!el) {
    return;
  }
  let observer = new IntersectionObserver(
    function ([entry]) {
      const ratio = entry.intersectionRatio;

      if (ratio < threshold) {
        let place =
          ratio <= 0 && centerIfNeeded
            ? ("center" as const)
            : ("nearest" as const);
        el.scrollIntoView({
          block: place,
          inline: place,
          behavior: behavior ? behavior : "auto",
        });
      }
      observer.disconnect();
    },
    { threshold: [0, threshold] },
  );
  observer.observe(el);
}
