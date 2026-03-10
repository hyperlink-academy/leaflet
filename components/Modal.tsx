import * as Dialog from "@radix-ui/react-dialog";
import React from "react";
import { CloseTiny } from "./Icons/CloseTiny";

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
  trigger: React.ReactNode;
  title?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild={asChild}>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed z-10 inset-0 bg-primary data-[state=open]:animate-overlayShow opacity-60" />
        <Dialog.Content
          className={`
          z-20 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          overflow-y-scroll no-scrollbar w-max max-w-screen h-fit max-h-screen p-3 flex flex-col

          `}
        >
          <Dialog.Close className="bg-bg-page rounded-full -mb-3 mr-2  z-10 w-fit p-1 place-self-end border border-border-light text-tertiary">
            <CloseTiny />
          </Dialog.Close>
          <div
            className={`
            opaque-container p-3
            flex flex-col gap-1 rounded-lg!
            ${className}`}
          >
            {title ? (
              <Dialog.Title>
                <h3>{title}</h3>
              </Dialog.Title>
            ) : (
              <Dialog.Title />
            )}
            <Dialog.Description>{children}</Dialog.Description>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
