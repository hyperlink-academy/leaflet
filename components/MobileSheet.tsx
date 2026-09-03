"use client";
import * as Dialog from "@radix-ui/react-dialog";
import React, { useEffect, useRef, useState } from "react";
import { animated, to, useSpring, useTransition } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { isIOS } from "src/utils/isDevice";
import { CloseTiny } from "./Icons/CloseTiny";
import { useVisualViewport } from "./ViewportSizeLayout";
import { GoToArrowLined } from "./Icons/GoToArrowLined";

// A mobile drawer sheet that slides up from the bottom of the screen. Built on
// Radix Dialog so it traps focus and handles the escape key; react-spring
// drives the slide in/out (Radix is forceMounted while the exit animation
// plays). A drag handle at the top lets the user pull the sheet down to close.
export const MobileSheet = ({
  className,
  open,
  onOpenChange,
  asChild,
  onBack,
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
  onBack?: () => void;
  asChild?: boolean;
  trigger?: React.ReactNode;
  title?: React.ReactNode;

  id?: string;
  contentRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}) => {
  let { height, offsetTop, difference } = useVisualViewport();

  let keyboardOpen = isIOS() && difference !== 0 && height > 0;

  let [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  let isOpen = open ?? uncontrolledOpen;
  let setOpen = (o: boolean) => {
    setUncontrolledOpen(o);
    onOpenChange?.(o);
  };

  let sheetRef = useRef<HTMLDivElement>(null);

  let scrollerRef = useRef<HTMLDivElement>(null);
  let setScrollerRef = (el: HTMLDivElement | null) => {
    scrollerRef.current = el;
    if (typeof contentRef === "function") contentRef(el);
    else if (contentRef)
      (contentRef as React.MutableRefObject<HTMLDivElement | null>).current =
        el;
  };

  let transitions = useTransition(isOpen, {
    from: { y: 100, opacity: 0 },
    enter: { y: 0, opacity: 1 },
    leave: { y: 100, opacity: 0 },
    config: { tension: 300, friction: 30, clamp: true },
  });

  let [{ dragY }, dragApi] = useSpring(() => ({ dragY: 0 }));

  useEffect(() => {
    if (isOpen) dragApi.set({ dragY: 0 });
  }, [isOpen, dragApi]);

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
        // An active text selection means the touch is dragging iOS selection
        // handles — preventDefaulting those touchmoves cancels the native
        // selection drag, so let WebKit own the touch.
        if ((window.getSelection()?.toString().length ?? 0) > 0) return;
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
                className="mobileSheet portalStyles z-50 fixed bottom-0 left-0 right-0 w-full h-[85dvh] flex flex-col text-primary"
              >
                <div className="flex justify-end gap-3 pr-3">
                  {onBack && (
                    <button
                      type="button"
                      onClick={onBack}
                      className="bg-bg-page rounded-full mb-2 mr-0  z-10 w-fit p-0.5 place-self-end border border-border-light text-tertiary"
                    >
                      <GoToArrowLined className="rotate-180" />
                    </button>
                  )}
                  <Dialog.Close className="bg-bg-page rounded-full mb-2 mr-0  z-10 w-fit p-0.5 place-self-end border border-border-light text-tertiary">
                    <CloseTiny />
                  </Dialog.Close>
                </div>
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
