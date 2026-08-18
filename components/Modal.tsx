"use client";
import * as Dialog from "@radix-ui/react-dialog";
import React from "react";
import { isIOS } from "src/utils/isDevice";
import { CloseTiny } from "./Icons/CloseTiny";
import { useVisualViewport } from "./ViewportSizeLayout";
import { useIsMobile } from "src/hooks/isMobile";
import { MobileSheet } from "./MobileSheet";
import { GoToArrowLined } from "./Icons/GoToArrowLined";

type ModalProps = {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
  sheetOnMobile?: boolean;
  sheetClassName?: string;
  onBack?: () => void;
};

export const Modal = (props: ModalProps) => {
  if (props.sheetOnMobile) return <SheetOnMobileModal {...props} />;
  return <DialogModal {...props} />;
};

const SheetOnMobileModal = (props: ModalProps) => {
  let isMobile = useIsMobile();
  if (!isMobile) return <DialogModal {...props} />;
  return (
    <MobileSheet
      className={props.sheetClassName}
      open={props.open}
      onOpenChange={props.onOpenChange}
      asChild={props.asChild}
      trigger={props.trigger}
      title={props.title}
      actionButton={props.actionButton}
      onBack={props.onBack}
    >
      {props.children}
    </MobileSheet>
  );
};

const DialogModal = ({
  className,
  open,
  onOpenChange,
  asChild,
  trigger,
  actionButton,
  title,
  children,
  onBack,
}: ModalProps) => {
  let { height, offsetTop, difference } = useVisualViewport();
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
          className="fixed z-50 inset-0 bg-primary/60 backdrop-blur-sm data-[state=open]:animate-overlayShow"
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
          portalStyles
          z-50 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          overflow-y-scroll no-scrollbar max-w-[calc(100vw-32px)] h-fit max-h-[calc(100dvh-32px)] flex flex-col w-full sm:w-max text-primary
          `}
        >
          <div className="flex gap-3 justify-end">
            {onBack && (
              <button
                className="bg-bg-page rounded-full mb-2 mr-0  z-10 w-fit p-0.5 place-self-end border border-border-light text-tertiary"
                type="button"
                onClick={onBack}
              >
                <GoToArrowLined className="rotate-180" />
              </button>
            )}
            <Dialog.Close className="bg-bg-page rounded-full mb-2 mr-0  z-10 w-fit p-0.5 place-self-end border border-border-light text-tertiary">
              <CloseTiny />
            </Dialog.Close>
          </div>
          <div
            className={`
            opaque-container p-3
            flex flex-col rounded-lg! min-h-0 overflow-y-scroll
            ${className}`}
          >
            {title ? (
              <div className="flex gap-4 justify-between items-start pb-1 ">
                <Dialog.Title asChild>
                  <h3 className="text-primary grow">{title}</h3>
                </Dialog.Title>
                {actionButton && actionButton}
              </div>
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
