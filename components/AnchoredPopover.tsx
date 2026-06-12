"use client";

import { ReactNode, useEffect, useMemo } from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { PopoverArrow } from "components/Icons/PopoverArrow";
import { theme } from "tailwind.config";

// Shared shell for popovers anchored to a DOM range inside a document — the
// link, comment, and footnote popovers all open against an element the user
// clicked/tapped in the editor. It owns the parts that were previously copied
// between them: a fixed virtual anchor sized to the element's bounding rect,
// Radix flip/collision handling, dismissal on scroll/resize, and the arrow.
// Callers supply only their own content and a padding/identifier className.
export function AnchoredPopover(props: {
  open: boolean;
  anchorElement: HTMLElement | null;
  onClose: () => void;
  // Position override. By default the popover is pinned to anchorElement's
  // bounding rect measured once. Callers that need the popover to follow a
  // moving anchor (e.g. the comment popover, which stays open while the block
  // scrolls/reflows) own the measurement and pass the live rect here, paired
  // with dismissOnScroll={false}.
  rect?: DOMRect;
  // When true (default) the popover closes on scroll/resize, since the
  // measured rect would otherwise leave it stranded where the anchor used to
  // be. Set false when the caller supplies a live rect that follows the anchor.
  dismissOnScroll?: boolean;
  // When true (default) any outside interaction dismisses the popover. Set
  // false to ignore focus-shift dismissals — e.g. when the opening tap also
  // moves focus into the editor, which would otherwise close it immediately.
  dismissOnFocusOutside?: boolean;
  // Per-popover padding plus an identifier class (e.g. "footnote-popover",
  // which globals.css uses to scope the document font onto the content).
  className?: string;
  children: ReactNode;
}) {
  let {
    open,
    anchorElement,
    onClose,
    rect: rectProp,
    dismissOnScroll = true,
    dismissOnFocusOutside = true,
    className,
    children,
  } = props;

  // The virtual anchor is positioned from a one-time getBoundingClientRect, so
  // it won't follow the page if it scrolls or the layout reflows — close out
  // rather than leave the popover stranded next to where the anchor used to be.
  useEffect(() => {
    if (!dismissOnScroll || !open || !anchorElement) return;
    let handleScroll = () => onClose();
    let scrollWrapper = anchorElement.closest(".pageScrollWrapper");
    scrollWrapper?.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", onClose);
    return () => {
      scrollWrapper?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", onClose);
    };
  }, [dismissOnScroll, open, anchorElement, onClose]);

  let measuredRect = useMemo(
    () => anchorElement?.getBoundingClientRect(),
    [anchorElement],
  );
  let anchorRect = rectProp ?? measuredRect;

  return (
    <RadixPopover.Root open={open}>
      <RadixPopover.Anchor
        style={{
          position: "fixed",
          top: anchorRect?.top ?? 0,
          left: anchorRect?.left ?? 0,
          width: anchorRect?.width ?? 0,
          height: anchorRect?.height ?? 0,
          pointerEvents: "none",
        }}
      />
      <RadixPopover.Portal>
        <RadixPopover.Content
          side="top"
          align="center"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // The opening tap can move focus into the editor right after; when
            // dismissOnFocusOutside is off, a focus shift never dismisses —
            // only pointer interaction outside does.
            if (
              !dismissOnFocusOutside &&
              e.detail.originalEvent.type === "focusin"
            )
              return;
            // Clicking the element the popover is anchored to re-opens it via
            // the editor's click handler — leave it alone to avoid a
            // close/reopen flicker. Any other outside interaction dismisses.
            let target = e.detail.originalEvent.target as Node | null;
            if (anchorElement && target && anchorElement.contains(target))
              return;
            onClose();
          }}
          className={`z-50 bg-bg-page border border-border rounded-lg shadow-md w-[min(calc(100vw-24px),320px)] ${className ?? ""}`}
        >
          {children}
          <RadixPopover.Arrow asChild width={16} height={8}>
            <PopoverArrow
              arrowFill={theme.colors["bg-page"]}
              arrowStroke={theme.colors["border"]}
            />
          </RadixPopover.Arrow>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
