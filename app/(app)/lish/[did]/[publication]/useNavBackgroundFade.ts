import { useEffect, useRef, useState } from "react";

// Fades the publication nav's background in as the user scrolls, reaching full
// opacity exactly when the nav reaches its sticky position. Only the background
// fades — the tabs/contents stay fully opaque. Shared by the editor nav
// (PublicationPagesEditNav) and the published nav (PublicationNav) so they stay
// identical.
//
// When `cardBorderHidden` is true the nav sits flush against the top with a
// solid background, so there's nothing to fade and opacity is pinned to 1.
export function useNavBackgroundFade(cardBorderHidden: boolean) {
  let navRef = useRef<HTMLElement>(null);
  let [bgOpacity, setBgOpacity] = useState(0);
  useEffect(() => {
    if (cardBorderHidden) {
      setBgOpacity(1);
      return;
    }
    let nav = navRef.current;
    if (!nav) return;
    // The nav is sticky within the nearest scrolling ancestor — the page card's
    // own scroll container in the editor, the publication scroll container when
    // published — both of which carry the `.publicationScrollContainer` marker.
    let scroller = nav.closest<HTMLElement>(".publicationScrollContainer");
    if (!scroller) return;
    let stickyOffset = 8; // top-2 = 0.5rem
    let update = () => {
      let navRect = nav.getBoundingClientRect();
      let scrollerRect = scroller.getBoundingClientRect();
      // The nav's offset from the top of the scrollable content; stays constant
      // whether or not the nav is currently stuck.
      let offsetTop = navRect.top - scrollerRect.top + scroller.scrollTop;
      let range = offsetTop - stickyOffset;
      let opacity =
        range <= 0 ? 1 : Math.min(1, Math.max(0, scroller.scrollTop / range));
      setBgOpacity(opacity);
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, [cardBorderHidden]);

  return { navRef, bgOpacity };
}
