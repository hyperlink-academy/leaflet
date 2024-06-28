export async function isVisible(el: Element) {
  return new Promise<boolean>((resolve) => {
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          resolve(entry.isIntersecting);
          observer.unobserve(entry.target);
        });
      },
      {
        root: null, // Use the viewport as the root
        threshold: 0.1, // Trigger when 10% of the element is visible
      },
    );

    observer.observe(el);
  });
}
