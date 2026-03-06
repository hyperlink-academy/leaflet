import { scrollIntoViewIfNeeded } from "./scrollIntoViewIfNeeded";

export function scrollIntoView(
  elementId: string,
  scrollContainerId: string = "pages",
  threshold: number = 0.9,
) {
  const element = document.getElementById(elementId);
  // Use double requestAnimationFrame to ensure the element is fully painted
  // before attempting to scroll. This fixes smooth scrolling when opening
  // pages from within other pages.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollIntoViewIfNeeded(element, false, "smooth");
    });
  });
}
