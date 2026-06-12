"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import * as RadixPopover from "@radix-ui/react-popover";
import { PopoverArrow } from "components/Icons/PopoverArrow";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { theme } from "tailwind.config";
import { useEntity } from "src/replicache";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { Avatar } from "components/Avatar";
import { useCommentContext } from "./CommentContext";
import { useCommentSheetStore } from "./commentStores";
import { getCommentPlaintext } from "./getCommentQuote";

type CommentPopoverState = {
  // An anchor span can carry several comment IDs where comments overlap; the
  // popover shows the first one that still exists (and isn't resolved)
  commentIDs: string[] | null;
  anchorElement: HTMLElement | null;
  open: (commentIDs: string[], anchor: HTMLElement) => void;
  close: () => void;
};

export const useCommentPopoverStore = create<CommentPopoverState>((set) => ({
  commentIDs: null,
  anchorElement: null,
  open: (commentIDs, anchor) => set({ commentIDs, anchorElement: anchor }),
  close: () => set({ commentIDs: null, anchorElement: null }),
}));

// On mobile, tapping a commented range shows this popover (like the link
// popover) with an excerpt of the comment and a button that opens the full
// thread in the slide-in sheet.
export function CommentPopover() {
  let { commentIDs, anchorElement, close } = useCommentPopoverStore();
  let { pageID, comments } = useCommentContext();

  let comment = commentIDs
    ? comments.find((c) => commentIDs.includes(c.commentEntityID))
    : undefined;
  let isOpen = !!comment && !!anchorElement;

  let content = useEntity(comment?.commentEntityID ?? null, "block/text");
  let replies = useEntity(comment?.commentEntityID ?? null, "comment/reply");
  let author = useEntity(comment?.commentEntityID ?? null, "comment/author");
  let { data: profile } = useRecordFromDid(author?.data.value);
  let excerpt = useMemo(
    () => getCommentPlaintext(content?.data.value),
    [content?.data.value],
  );

  // The popover stays open while the tap also places the cursor in the
  // block: focusing scrolls the caret into view and (on mobile) opens the
  // keyboard, so rather than closing on scroll/resize, follow the anchor.
  // ProseMirror can also re-render the span (e.g. while typing), so re-find
  // it by comment ID when the stored element is detached.
  let [anchorRect, setAnchorRect] = useState<DOMRect | undefined>();
  useEffect(() => {
    if (!isOpen || !anchorElement || !commentIDs) {
      setAnchorRect(undefined);
      return;
    }
    let update = () => {
      let el: HTMLElement | null = anchorElement;
      if (!el!.isConnected) {
        el = document.querySelector(
          `.comment-anchor[data-comment-id~="${commentIDs![0]}"]`,
        );
        if (!el) {
          close();
          return;
        }
      }
      setAnchorRect(el.getBoundingClientRect());
    };
    update();

    let scrollWrapper = anchorElement.closest(".pageScrollWrapper");
    scrollWrapper?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    // Typing in the block reflows the text and moves the anchor
    let mutationObserver = new MutationObserver(update);
    if (scrollWrapper)
      mutationObserver.observe(scrollWrapper, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    return () => {
      scrollWrapper?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      mutationObserver.disconnect();
    };
  }, [isOpen, anchorElement, commentIDs, close]);

  if (!comment) return null;
  let commentEntityID = comment.commentEntityID;
  // Measure directly on the first render; the effect above takes over and
  // keeps the rect in sync afterwards
  let rect = anchorRect ?? anchorElement?.getBoundingClientRect();

  return (
    <RadixPopover.Root open={isOpen}>
      <RadixPopover.Anchor
        style={{
          position: "fixed",
          top: rect?.top ?? 0,
          left: rect?.left ?? 0,
          width: rect?.width ?? 0,
          height: rect?.height ?? 0,
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
            // The block's focus handling can move focus into the editor
            // right after the opening tap — only pointer interactions
            // outside dismiss the popover, never focus shifts.
            if (e.detail.originalEvent.type === "focusin") return;
            // Tapping the commented range the popover is anchored to re-opens
            // it via the editor's click handler — leave it alone to avoid a
            // close/reopen flicker. Any other outside interaction dismisses.
            let target = e.detail.originalEvent.target as Node | null;
            if (anchorElement && target && anchorElement.contains(target))
              return;
            close();
          }}
          className="comment-popover z-50 bg-bg-page border border-border rounded-lg shadow-md px-3 py-1.5 w-[min(calc(100vw-24px),320px)]"
        >
          <div className="flex items-center gap-2">
            <div className="shrink-0">
              <Avatar
                src={profile?.avatar}
                displayName={profile?.displayName || profile?.handle}
                size="small"
              />
            </div>
            <div
              className="grow min-w-0 text-sm text-secondary whitespace-nowrap overflow-hidden"
              style={{
                maskImage: "linear-gradient(to right, black 75%, transparent)",
              }}
            >
              {excerpt}
            </div>
            <button
              className="shrink-0 text-accent-contrast"
              title={replies.length > 0 ? "Open thread" : "Open comment"}
              onClick={() => {
                useCommentSheetStore
                  .getState()
                  .openSheet(pageID, commentEntityID);
                close();
              }}
            >
              <ArrowRightTiny />
            </button>
          </div>
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
