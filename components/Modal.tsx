"use client";
import * as Dialog from "@radix-ui/react-dialog";
import React from "react";
import { isIOS } from "src/utils/isDevice";
import { CloseTiny } from "./Icons/CloseTiny";
import { useVisualViewport } from "./ViewportSizeLayout";

export const Modal = ({
  className,
  open,
  onOpenChange,
  asChild,
  trigger,
  title,
  children,
}: {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  children: React.ReactNode;
}) => {
  let { height, offsetTop, difference } = useVisualViewport();
  // iOS keyboard open: re-center modal against the visual viewport. Android
  // resizes the layout viewport via interactiveWidget: "resizes-content".
  let keyboardOpen = isIOS() && difference !== 0 && height > 0;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger !== undefined && (
        <Dialog.Trigger asChild={asChild}>{trigger}</Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay
          style={
            keyboardOpen
              ? { top: `${offsetTop}px`, height: `${height}px` }
              : undefined
          }
          className="fixed z-50 inset-0 bg-primary data-[state=open]:animate-overlayShow opacity-60"
        />
        <Dialog.Content
          style={
            keyboardOpen
              ? {
                  top: `${offsetTop + height / 2}px`,
                  maxHeight: `${height - 32}px`,
                }
              : undefined
          }
          className={`
          z-50 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          overflow-y-scroll no-scrollbar max-w-[calc(100vw-32px)] h-fit max-h-[calc(100dvh-32px)] p-3 flex flex-col w-full sm:w-max

          `}
        >
          <Dialog.Close className="bg-bg-page rounded-full -mb-3 mr-2  z-10 w-fit p-1 place-self-end border border-border-light text-tertiary">
            <CloseTiny />
          </Dialog.Close>
          <div
            className={`
            opaque-container p-3
            flex flex-col rounded-lg!
            ${className}`}
          >
            {title ? (
              <Dialog.Title asChild>
                <h3 className="pb-1">{title}</h3>
              </Dialog.Title>
            ) : (
              <Dialog.Title />
            )}
            <Dialog.Description asChild>
              <div>{children}</div>
            </Dialog.Description>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
