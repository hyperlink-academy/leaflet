import { scrollIntoViewIfNeeded } from "./scrollIntoViewIfNeeded";

export function scrollIntoView(
  elementId: string,
  scrollContainerId: string = "pages",
  threshold: number = 0.9,
) {
  const element = document.getElementById(elementId);
  scrollIntoViewIfNeeded(element, false);
}
