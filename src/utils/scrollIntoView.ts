// Generated with claude code, sonnet 4.5
/**
 * Scrolls an element into view within a scrolling container using Intersection Observer
 * and the scrollTo API, instead of the native scrollIntoView.
 *
 * @param elementId - The ID of the element to scroll into view
 * @param scrollContainerId - The ID of the scrolling container (defaults to "pages")
 * @param threshold - Intersection observer threshold (0-1, defaults to 0.2 for 20%)
 */
export function scrollIntoView(
  elementId: string,
  scrollContainerId: string = "pages",
  threshold: number = 0.9,
) {
  const element = document.getElementById(elementId);
  const scrollContainer = document.getElementById(scrollContainerId);

  if (!element || !scrollContainer) {
    console.warn(`scrollIntoView: element or container not found`, {
      elementId,
      scrollContainerId,
      element,
      scrollContainer,
    });
    return;
  }

  // Create an intersection observer to check if element is visible
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];

      // If element is not sufficiently visible, scroll to it
      if (!entry.isIntersecting || entry.intersectionRatio < threshold) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // Calculate the target scroll position
        // We want to center the element horizontally in the container
        const targetScrollLeft =
          scrollContainer.scrollLeft +
          elementRect.left -
          containerRect.left -
          (containerRect.width - elementRect.width) / 2;

        scrollContainer.scrollTo({
          left: targetScrollLeft,
          behavior: "smooth",
        });
      }

      // Disconnect after checking once
      observer.disconnect();
    },
    {
      root: scrollContainer,
      threshold: threshold,
    },
  );

  observer.observe(element);
}
