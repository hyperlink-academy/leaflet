"use client";
import * as Dialog from "@radix-ui/react-dialog";
import React from "react";
import { isIOS } from "src/utils/isDevice";
import { CloseTiny } from "./Icons/CloseTiny";
import { useVisualViewport } from "./ViewportSizeLayout";

// A mobile drawer sheet that slides up from the bottom of the screen. Built on
// Radix Dialog so it traps focus, handles the escape key, and animates open and
// closed via the .bottom-sheet-content keyframes in globals.css.
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
}) => {
  let { height, offsetTop, difference } = useVisualViewport();
  // iOS keyboard open: the layout viewport (and dvh) don't shrink for the
  // keyboard, so a bottom-anchored sheet would sit behind it. Lift the sheet to
  // the top of the keyboard and shrink it to the visual viewport. Android
  // resizes the layout viewport via interactiveWidget: "resizes-content", so
  // bottom-0 + dvh already follow the keyboard there.
  let keyboardOpen = isIOS() && difference !== 0 && height > 0;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger !== undefined && (
        <Dialog.Trigger asChild={asChild}>{trigger}</Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed z-50 inset-0 bg-primary/60 backdrop-blur-sm data-[state=open]:animate-overlayShow" />
        <Dialog.Content
          style={
            keyboardOpen
              ? {
                  bottom: `${difference - offsetTop}px`,
                  height: `${height - 16}px`,
                }
              : undefined
          }
          className={`
            mobileSheet
          z-50 fixed bottom-0 left-0 right-0
          w-full h-[85dvh] flex flex-col text-primary
          `}
        >
          <div
            ref={contentRef}
            id={id}
            className={`
            opaque-container pwa-padding-bottom
            p-3 pt-2 flex flex-col rounded-b-none! rounded-t-lg!
            h-full overflow-y-scroll
            ${className}`}
          >
            {/* When a title is given the sheet supplies its own header + close
                button; otherwise the children are expected to render their own
                chrome. Radix still requires a Dialog.Title for accessibility. */}
            {title ? (
              <div className="w-full flex items-center gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <Dialog.Title asChild>
                    <h3 className="text-primary">{title}</h3>
                  </Dialog.Title>
                </div>
                <Dialog.Close className="text-tertiary shrink-0">
                  <CloseTiny />
                </Dialog.Close>
              </div>
            ) : (
              <Dialog.Title />
            )}
            <Dialog.Description asChild>
              <div className="flex flex-col">
                {children}
                <div className="spacer h-6" />
              </div>
            </Dialog.Description>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
