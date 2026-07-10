"use client";
import * as Dialog from "@radix-ui/react-dialog";
import React, { useEffect, useRef, useState } from "react";
import { animated, to, useSpring, useTransition } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { isIOS } from "src/utils/isDevice";
import { CloseTiny } from "./Icons/CloseTiny";
import { useVisualViewport } from "./ViewportSizeLayout";

// A mobile drawer sheet that slides up from the bottom of the screen. Built on
// Radix Dialog so it traps focus and handles the escape key; react-spring
// drives the slide in/out (Radix is forceMounted while the exit animation
// plays). A drag handle at the top lets the user pull the sheet down to close.
export const MobileSheet = ({
  className,
  open,
  onOpenChange,
  asChild,
  trigger,
  title,
  id,
  contentRef,
  children,
  actionButton,
}: {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  // Forwarded to the scrolling content container so callers can scroll it into
  // view or reset its scroll position.
  id?: string;
  contentRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}) => {
  let { height, offsetTop, difference } = useVisualViewport();
  // iOS keyboard open: the layout viewport (and dvh) don't shrink for the
  // keyboard, so a bottom-anchored sheet would sit behind it. Lift the sheet to
  // the top of the keyboard and shrink it to the visual viewport. Android
  // resizes the layout viewport via interactiveWidget: "resizes-content", so
  // bottom-0 + dvh already follow the keyboard there.
  let keyboardOpen = isIOS() && difference !== 0 && height > 0;

  // Support uncontrolled (trigger-driven) usage alongside the controlled open
  // prop.
  let [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  let isOpen = open ?? uncontrolledOpen;
  let setOpen = (o: boolean) => {
    setUncontrolledOpen(o);
    onOpenChange?.(o);
  };

  let sheetRef = useRef<HTMLDivElement>(null);
  // Internal handle on the scrolling content container (for the drag-at-top
  // check below), merged with the forwarded contentRef.
  let scrollerRef = useRef<HTMLDivElement>(null);
  let setScrollerRef = (el: HTMLDivElement | null) => {
    scrollerRef.current = el;
    if (typeof contentRef === "function") contentRef(el);
    else if (contentRef)
      (contentRef as React.MutableRefObject<HTMLDivElement | null>).current =
        el;
  };

  // Mount/unmount slide + overlay fade. y is a percentage of the sheet's own
  // height; clamp so the spring never overshoots above the bottom edge.
  let transitions = useTransition(isOpen, {
    from: { y: 100, opacity: 0 },
    enter: { y: 0, opacity: 1 },
    leave: { y: 100, opacity: 0 },
    config: { tension: 300, friction: 30, clamp: true },
  });

  // Drag offset (px) layered on top of the transition's y.
  let [{ dragY }, dragApi] = useSpring(() => ({ dragY: 0 }));

  // A close that started from a drag leaves dragY where it was so the exit
  // animation continues downward from there; reset it for the next open.
  useEffect(() => {
    if (isOpen) dragApi.set({ dragY: 0 });
  }, [isOpen, dragApi]);

  // On release: past a quarter of the sheet, or a downward flick, close.
  // Otherwise spring back into place.
  let settleDrag = (offsetY: number, vy: number, dy: number) => {
    let sheetHeight = sheetRef.current?.offsetHeight ?? 0;
    if (offsetY > sheetHeight * 0.25 || (vy > 0.5 && dy > 0)) setOpen(false);
    else dragApi.start({ dragY: 0 });
  };

  let bindHandle = useDrag(
    ({ last, offset: [, oy], velocity: [, vy], direction: [, dy] }) => {
      if (!last) dragApi.set({ dragY: Math.max(0, oy) });
      else settleDrag(Math.max(0, oy), vy, dy);
    },
    { axis: "y", from: () => [0, dragY.get()] },
  );

  // Pulling down on the content when it's scrolled to the top also drags the
  // sheet. Touch-only — a mouse drag in the content should select text, not
  // move the sheet. The gesture engages once the scroller is at the top and the
  // finger moves downward; from then on we preventDefault the (non-passive)
  // touchmove events to take over from native scrolling. Movement before
  // engagement (e.g. scrolling up to the top first) is subtracted off via the
  // memo so the sheet doesn't jump.
  let bindContent = useDrag(
    ({
      last,
      movement: [, my],
      velocity: [, vy],
      direction: [, dy],
      event,
      memo,
    }) => {
      let m = memo as { engagedAt: number; base: number } | undefined;
      if (!m) {
        if (!("touches" in event)) return;
        if ((scrollerRef.current?.scrollTop ?? 0) > 0) return;
        if (dy <= 0) return;
        m = { engagedAt: my, base: dragY.get() };
      }
      if (event.cancelable) event.preventDefault();
      let offsetY = Math.max(0, m.base + my - m.engagedAt);
      if (!last) dragApi.set({ dragY: offsetY });
      else settleDrag(offsetY, vy, dy);
      return m;
    },
    {
      axis: "y",
      pointer: { touch: true },
      eventOptions: { passive: false },
      filterTaps: true,
    },
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      {trigger !== undefined && (
        <Dialog.Trigger asChild={asChild}>{trigger}</Dialog.Trigger>
      )}
      {transitions((style, show) =>
        show ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <animated.div
                // The overlay also fades proportionally as the sheet is
                // dragged toward the bottom of the screen.
                style={{
                  opacity: to([style.opacity, dragY], (o, px) => {
                    let sheetHeight = sheetRef.current?.offsetHeight;
                    return sheetHeight
                      ? o * Math.max(0, 1 - px / sheetHeight)
                      : o;
                  }),
                }}
                className="fixed z-50 inset-0 bg-primary/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content forceMount asChild>
              <animated.div
                ref={sheetRef}
                style={{
                  transform: to(
                    [style.y, dragY],
                    (y, px) => `translate3d(0, calc(${y}% + ${px}px), 0)`,
                  ),
                  ...(keyboardOpen
                    ? {
                        bottom: `${difference - offsetTop}px`,
                        height: `${height - 16}px`,
                      }
                    : {}),
                }}
                className="mobileSheet z-50 fixed bottom-0 left-0 right-0 w-full h-[85dvh] flex flex-col text-primary"
              >
                <div className="opaque-container pwa-padding-bottom flex flex-col rounded-b-none! rounded-t-lg! h-full overflow-hidden">
                  <div
                    {...bindHandle()}
                    className="touch-none shrink-0 flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-1 rounded-full bg-border" />
                  </div>
                  <div
                    {...bindContent()}
                    ref={setScrollerRef}
                    id={id}
                    className={`
                    px-3 pb-3 pt-1 flex flex-col grow
                    overflow-y-scroll overscroll-y-contain
                    ${className}`}
                  >
                    <div className="flex justify-between gap-4">
                      {title ? (
                        <div className="w-full flex items-center gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <Dialog.Title asChild>
                              <h3 className="text-primary">{title}</h3>
                            </Dialog.Title>
                          </div>
                          {actionButton && actionButton}

                          <Dialog.Close className="text-tertiary shrink-0">
                            <CloseTiny />
                          </Dialog.Close>
                        </div>
                      ) : (
                        // Radix requires a Dialog.Title for accessibility.
                        <Dialog.Title />
                      )}
                    </div>
                    <Dialog.Description asChild>
                      <div className="flex flex-col">
                        {children}
                        <div className="spacer h-6" />
                      </div>
                    </Dialog.Description>
                  </div>
                </div>
              </animated.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null,
      )}
    </Dialog.Root>
  );
};
